import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import { DateTime } from 'luxon'
import Helper from 'App/Common/Helper'

export default class DashboardsController {
  public async widgetSummary({ auth, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    // let params = request.all()

    try {
      let summary: any = {
        today_gross_profit: 0,
        today_transaction: 0,
        total_purchase: 0,
        total_product: 0,
        total_customer: 0,
        today_customer: 0,
      }

      let queryFilterTransaction: any
      // let queryFilterOrder: any
      // let queryFilterPO: any
      // let getBranchId: any

      const dateNow = DateTime.local().toString()
      queryFilterTransaction = `WHERE 1=1 
        AND transaction_status = 'completed'
        AND transaction_branch_id = ${auth.user?.user_branch_id} `
      // queryFilterOrder = `WHERE 1=1 AND transaction_status != 'cancel' `
      // queryFilterPO = `WHERE 1=1 AND branch_status = 'active'`

      // let today = new Date()
      let date = DateTime.now().toFormat('yyyy-MM-dd')
      // let oneJan = (new Date(today.getFullYear(), 0, 2))
      // let numberOfDays = Math.floor((Number(today) - Number(oneJan)) / (24 * 60 * 60 * 1000))
      // let weekly = Math.ceil((today.getDay() + 1 + numberOfDays) / 7)
      // let monthly = String(today.getMonth() + 1).padStart(2, '0')

      queryFilterTransaction += `AND transaction_order_date = '${date}' `
      // queryFilterOrder += `AND transaction_order_date = '${date}' `

      // if (params.transactionPeriode && params.transactionPeriode.length > 0) {
      //   if (params.transactionPeriode == 'daily') {
      //     // queryFilterTransaction += `AND DATE(transaction_created_at) = DATE('${dateNow}') `
      //     queryFilterTransaction += `AND DATE(transaction_created_at) = '${date}' `
      //   } else if (params.transactionPeriode == 'weekly') {
      //     queryFilterTransaction += `AND EXTRACT(week from transaction_created_at) = '${weekly}' `
      //   } else if (params.transactionPeriode == 'monthly') {
      //     queryFilterTransaction += `AND EXTRACT(month from transaction_created_at) = '${monthly}' `
      //   } else {
      //     queryFilterTransaction += ` `
      //   }
      // }

      // if (params.OrderPeriode && params.OrderPeriode.length > 0) {
      //   if (params.OrderPeriode == 'daily') {
      //     queryFilterOrder += `AND DATE(transaction_created_at) = '${date}' `
      //   } else if (params.OrderPeriode == 'weekly') {
      //     queryFilterOrder += `AND EXTRACT(week from transaction_created_at) = '${weekly}' `
      //   } else if (params.OrderPeriode == 'monthly') {
      //     queryFilterOrder += `AND EXTRACT(month from transaction_created_at) = '${monthly}' `
      //   } else {
      //     queryFilterOrder += ` `
      //   }
      // }

      // if (params.poPeriode && params.poPeriode.length > 0) {
      //   if (params.poPeriode == 'daily') {
      //     queryFilterPO += `AND DATE(po_created_at) = DATE('${date}') `
      //   } else if (params.poPeriode == 'weekly') {
      //     queryFilterPO += `AND EXTRACT(week from po_created_at) = '${weekly}' `
      //   } else if (params.poPeriode == 'monthly') {
      //     queryFilterPO += `AND EXTRACT(month from po_created_at) = '${monthly}' `
      //   } else {
      //     queryFilterPO += ` `
      //   }
      // }

      /* if role = branch_admin */
      // if (auth.user?.user_role == 'branch_admin') {
      //   getBranchId = await Database
      //     .query()
      //     .from('user_branches')
      //     .where('user_branch_user_id', auth.user?.user_id)
      //     .first()
      //   if (getBranchId) {
      //     queryFilterTransaction += ` AND transaction_branch_id = ${getBranchId.user_branch_branch_id}`
      //     queryFilterPO += ` AND po_branch_id = ${getBranchId.user_branch_branch_id}`
      //   } else {
      //     getBranchId.user_branch_branch_id = 0
      //   }
      // }

      /* get total transaction */
      let queryTransaction: any = await Database.rawQuery(`
        SELECT 
        CAST(COALESCE(SUM(transaction_grand_total), 0) as bigint) as total_transaction,
        CAST(COUNT(transaction_id) as bigint) as total_order
        FROM transactions
        ${queryFilterTransaction}
      `)
      summary.today_gross_profit = queryTransaction.rowCount > 0 ? Number(queryTransaction.rows[0].total_transaction) : 0
      summary.today_transaction = queryTransaction.rowCount > 0 ? Number(queryTransaction.rows[0].total_order) : 0

      /* get total purchase order */
      let queryPO: any = await Database.rawQuery(`
        SELECT 
        CAST(COALESCE(SUM(po_grandtotal), 0) as bigint) as purchase_order
        FROM pos
        JOIN branches ON po_branch_id = branch_id
        WHERE po_branch_id = ${auth.user?.user_branch_id}
      `)
      summary.total_purchase = queryPO.rowCount > 0 ? Number(queryPO.rows[0].purchase_order) : 0

      /* get total product */
      let queryProduct: any
      queryProduct = await Database.rawQuery(`
        SELECT 
        CAST(COUNT(branch_product_id) as bigint) as total_product
        FROM branch_products
        JOIN master_products ON branch_product_product_id = product_id
        WHERE product_is_deleted = 0
        AND branch_product_branch_id = ${auth.user?.user_branch_id}
      `)
      summary.total_product = queryProduct.rowCount > 0 ? Number(queryProduct.rows[0].total_product) : 0

      /* get total customer */
      let queryTotalCustomer: any = await Database.rawQuery(`
        SELECT 
        CAST(COUNT(user_id) as bigint) as total_customer
        FROM users
        WHERE user_role = 'customer'
        AND user_status = 'active'
        AND user_branch_id = ${auth.user?.user_branch_id}        
      `)
      summary.total_customer = queryTotalCustomer.rowCount > 0 ? Number(queryTotalCustomer.rows[0].total_customer) : 0

      /* get today customer */
      let queryTodayCustomer: any = await Database.rawQuery(`
        SELECT 
        CAST(COUNT(user_id) as bigint) as today_customer
        FROM users
        WHERE user_role = 'customer' AND DATE(user_created_at) = DATE('${dateNow}')
        AND user_branch_id = ${auth.user?.user_branch_id} 
      `)
      summary.today_customer = queryTodayCustomer.rowCount > 0 ? Number(queryTodayCustomer.rows[0].today_customer) : 0

      
      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          data: summary
        }
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async salesChart({auth, response}: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    try {
      let month = Number(DateTime.local().toFormat('MM'))
      let year = Number(DateTime.local().toFormat('yyyy'))

      let totalDays = new Date(year, month, 0).getDate();
      let startDate = new Date(year +'-'+ month +'-'+ 1)
      let endDate = new Date(year +'-'+ month +'-'+ totalDays)

      const dateRange = Helper.validDatesInRange(startDate, endDate)

      const newData: any = []
      if(dateRange.length > 0){
        for(let i = 0; i < dateRange.length; i++){
          let sql = `
            SELECT SUM(transaction_grand_total) as total
            FROM transactions
            WHERE DATE(transaction_order_date) = DATE('${dateRange[i]}')
            AND transaction_status = 'completed'
            AND transaction_branch_id = ${auth.user?.user_branch_id}
          `

          let result: any = await Database.rawQuery(sql)
          let resultData: any = result.rowCount > 0 ? result.rows[0].total : 0

          let data : any = {
            date: dateRange[i],
            total: resultData ? Number(resultData) : 0
          }

          newData.push(data)
        }
      }
       
      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          data: newData
        }
      }

    } catch(err){
      output.message = err.message
      output.code = 500
    }
    return response.status(200).json(output)
  }

  public async purchaseChart({auth, response}: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    try {
      let month = Number(DateTime.local().toFormat('MM'))
      let year = Number(DateTime.local().toFormat('yyyy'))

      let totalDays = new Date(year, month, 0).getDate();
      let startDate = new Date(year +'-'+ month +'-'+ 1)
      let endDate = new Date(year +'-'+ month +'-'+ totalDays)

      const dateRange = Helper.validDatesInRange(startDate, endDate)

      const newData: any = []
      if(dateRange.length > 0){
        for(let i = 0; i < dateRange.length; i++){
          let sql = `
            SELECT SUM(po_grandtotal) as total
            FROM pos
            WHERE DATE(po_date) = DATE('${dateRange[i]}')
            AND po_branch_id = ${auth.user?.user_branch_id}
          `

          let result: any = await Database.rawQuery(sql)
          let resultData: any = result.rowCount > 0 ? result.rows[0].total : 0
						
          let data : any = {
            date: dateRange[i],
            total: resultData ? Number(resultData) : 0
          }

          newData.push(data)
        }
      }
       
      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          data: newData
        }
      }

    } catch(err){
      output.message = err.message
      output.code = 500
    }
    return response.status(200).json(output)
  }

  public async totalSalesChart({auth, response}: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    try {
      let month = Number(DateTime.local().toFormat('MM'))
      let year = Number(DateTime.local().toFormat('yyyy'))

      let totalDays = new Date(year, month, 0).getDate();
      let startDate = new Date(year +'-'+ month +'-'+ 1)
      let endDate = new Date(year +'-'+ month +'-'+ totalDays)

      const dateRange = Helper.validDatesInRange(startDate, endDate)

      const newData: any = []
      if(dateRange.length > 0){
        for(let i = 0; i < dateRange.length; i++){
          let sql = `
            SELECT COUNT(transaction_id) as total
            FROM transactions
            WHERE DATE(transaction_order_date) = DATE('${dateRange[i]}')
            AND transaction_status = 'completed'
            AND transaction_branch_id = ${auth.user?.user_branch_id}
          `

          let result: any = await Database.rawQuery(sql)
          let resultData: any = result.rowCount > 0 ? result.rows[0].total : 0

          let data : any = {
            date: dateRange[i],
            total: resultData ? Number(resultData) : 0
          }

          newData.push(data)
        }
      }
       
      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          data: newData
        }
      }

    } catch(err){
      output.message = err.message
      output.code = 500
    }
    return response.status(200).json(output)
  }

  public async totalPurchaseChart({auth, response}: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    try {
      let month = Number(DateTime.local().toFormat('MM'))
      let year = Number(DateTime.local().toFormat('yyyy'))

      let totalDays = new Date(year, month, 0).getDate();
      let startDate = new Date(year +'-'+ month +'-'+ 1)
      let endDate = new Date(year +'-'+ month +'-'+ totalDays)

      const dateRange = Helper.validDatesInRange(startDate, endDate)

      const newData: any = []
      if(dateRange.length > 0){
        for(let i = 0; i < dateRange.length; i++){
          let sql = `
            SELECT COUNT(po_id) as total
            FROM pos
            WHERE DATE(po_date) = DATE('${dateRange[i]}')
            AND po_branch_id = ${auth.user?.user_branch_id}
          `

          let result: any = await Database.rawQuery(sql)
          let resultData: any = result.rowCount > 0 ? result.rows[0].total : 0
						
          let data : any = {
            date: dateRange[i],
            total: resultData ? Number(resultData) : 0
          }

          newData.push(data)
        }
      }
       
      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          data: newData
        }
      }

    } catch(err){
      output.message = err.message
      output.code = 500
    }
    return response.status(200).json(output)
  }

}