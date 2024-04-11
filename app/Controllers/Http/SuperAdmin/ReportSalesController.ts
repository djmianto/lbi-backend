import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
// import Excel from 'exceljs'
import { DateTime } from 'luxon'
// import Application from '@ioc:Adonis/Core/Application'
// import Env from '@ioc:Adonis/Core/Env'
import Helper from 'App/Common/Helper'

export default class ReportSalesController {
  public async indexYear({ auth, request, response }: HttpContextContract) {
    let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}
		let params = request.all()

    try{
      let sort = params.sort ? params.sort : ' EXTRACT(month from transaction_order_date)'
      let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let queryFilter = `WHERE 1 = 1 
        AND transaction_status = 'completed'
        AND transaction_branch_id = '${auth.user?.user_branch_id}' `

			if (params.year && params.year.length > 0) {
        queryFilter += `AND EXTRACT(year from transaction_order_date) = '${params.year}' `
      }

      let querySelect: string = `
        TO_CHAR(transaction_order_date, 'Month') as month_label,
        EXTRACT(month from transaction_order_date) as month,
        EXTRACT(year from transaction_order_date) as year,
        SUM(transaction_grand_total) as transaction_grand_total, 
        SUM(transaction_total_value) as transaction_total_value, 
        COUNT(transaction_id) as transaction_total, 
        SUM(transaction_total_qty) as transaction_total_product_qty
      `

      let sql = `
        SELECT ${querySelect}
        FROM transactions
        ${queryFilter} 
        GROUP BY TO_CHAR(transaction_order_date, 'Month'), EXTRACT(month from transaction_order_date), EXTRACT(year from transaction_order_date)
        ORDER BY ${sort} ${dir}
        ${queryLimit}
      `

      let sqlTotal = `
        SELECT 1 as total 
        FROM transactions
        ${queryFilter}
        GROUP BY TO_CHAR(transaction_order_date, 'Month'), EXTRACT(month from transaction_order_date), EXTRACT(year from transaction_order_date)
      `

      let result: any = await Database.rawQuery(sql)
      let totalRow = await Database.rawQuery(sqlTotal)
      let resultData: any = result.rowCount > 0 ? Helper.sanitizationResponse(result.rows) : []

      if(resultData.length > 0){
        for(let i in resultData){
          resultData[i].transaction_grand_total = Number(resultData[i].transaction_grand_total)
          resultData[i].transaction_total = Number(resultData[i].transaction_total)
          resultData[i].transaction_total_product_qty = Number(resultData[i].transaction_total_product_qty)
          resultData[i].transaction_total_value = Number(resultData[i].transaction_total_value)
					
					let sql_detail = `
						SELECT COUNT(transaction_detail_id) as transaction_total_qty
						FROM transaction_details
						LEFT JOIN transactions ON transaction_id = transaction_detail_transaction_id
						WHERE transaction_detail_transaction_id = transaction_id
						AND EXTRACT(month from transaction_order_date) = '${resultData[i].month}'
						AND EXTRACT(year from transaction_order_date) = '${resultData[i].year}'
						AND transaction_status = 'completed'
					`

					let resultDetail: any = await Database.rawQuery(sql_detail)
					resultData[i].transaction_total_qty = resultDetail.rowCount > 0 ? Number(resultDetail.rows[0].transaction_total_qty) : 0

        }
      }

      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          meta: Helper.pagination(totalRow.rowCount, page, limit),
          data: Helper.sanitizationResponse(resultData)
        }
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async indexMonth({ auth, request, response }: HttpContextContract) {
    let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}
		let params = request.all()

    try{
      let sort = params.sort ? params.sort : 'transaction_order_date'
      let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let queryFilter = `
        WHERE 1 = 1
        AND EXTRACT(year from transaction_order_date) = '${params.year}'
        AND EXTRACT(month from transaction_order_date) = '${params.month}'
        AND transaction_status = 'completed' 
        AND transaction_branch_id = '${auth.user?.user_branch_id}' 
      `

      if (params.supplier_id && params.supplier_id.length > 0) {
        queryFilter += `AND po_supplier_id = '${params.supplier_id}' `
      }

      if (params.start_date && params.start_date.length > 0) {
        if (params.end_date && params.end_date.length > 0) {
          queryFilter += `AND transaction_order_date BETWEEN '${params.start_date}' AND '${params.end_date}' `
        }
      }

      let querySelect: string = `
        transaction_order_date,
        SUM(transaction_grand_total) as transaction_grand_total, 
        SUM(transaction_total_value) as transaction_total_value, 
        COUNT(transaction_id) as transaction_total, 
        SUM(transaction_total_qty) as transaction_total_product_qty
      `

      let sql = `
        SELECT ${querySelect}
        FROM transactions
        ${queryFilter} 
        GROUP BY transaction_order_date
        ORDER BY ${sort} ${dir}
        ${queryLimit}
      `

      let sqlTotal = `
        SELECT 1 as total 
        FROM transactions
        ${queryFilter}
        GROUP BY transaction_order_date
      `

      let result: any = await Database.rawQuery(sql)
      let totalRow = await Database.rawQuery(sqlTotal)
      let resultData: any = result.rowCount > 0 ? Helper.sanitizationResponse(result.rows) : []

      if(resultData.length > 0){
        for(let i in resultData){
          resultData[i].transaction_grand_total = Number(resultData[i].transaction_grand_total)
          resultData[i].transaction_total = Number(resultData[i].transaction_total)
          resultData[i].transaction_total_product_qty = Number(resultData[i].transaction_total_product_qty)
          resultData[i].transaction_total_value = Number(resultData[i].transaction_total_value)
          
					let sql_detail = `
						SELECT COUNT(transaction_detail_id) as transaction_total_qty
						FROM transaction_details
						LEFT JOIN transactions ON transaction_id = transaction_detail_transaction_id
						WHERE transaction_detail_transaction_id = transaction_id
						AND transaction_order_date = '${resultData[i].transaction_order_date}'
						AND transaction_status = 'completed'
					`

					let resultDetail: any = await Database.rawQuery(sql_detail)
					resultData[i].transaction_total_qty = resultDetail.rowCount > 0 ? Number(resultDetail.rows[0].transaction_total_qty) : 0
        }
      }

      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          meta: Helper.pagination(totalRow.rowCount, page, limit),
          data: Helper.sanitizationResponse(resultData)
        }
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async indexDaily({ auth, request, response }: HttpContextContract) {
    let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}
		let params = request.all()

    try{
      let sort = params.sort ? params.sort : 'transaction_order_date'
      let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let search = params.search ? params.search : ''
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let queryFilter = `WHERE 1 = 1 
        AND transaction_status = 'completed' 
        AND transaction_order_date = '${params.date}'
        AND transaction_branch_id = '${auth.user?.user_branch_id}' 
      `

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
				AND (
            transaction_code ILIKE '%${search}%' OR
            transaction_customer_name ILIKE '%${search}%' OR
            transaction_payment_method ILIKE '%${search}%' OR
            transaction_pic_name ILIKE '%${search}%'
				) `
      }


      let querySelect: string = `
        transaction_id,
				transaction_code,
        transaction_branch_id,
        branch_name,
        transaction_customer_id,
        transaction_customer_name,
        transaction_pic_name,
        transaction_order_date,
        transaction_total_qty as transaction_total_product_qty,
        transaction_grand_total,
        transaction_total_value,
        transaction_status,
        transaction_payment_method,
        transaction_created_at,
				(
					SELECT COUNT(transaction_detail_id) as transaction_total_qty
					FROM transaction_details
					WHERE transaction_detail_transaction_id = transaction_id
				) as transaction_total_qty
      `

      let sql = `
        SELECT ${querySelect}
        FROM transactions
        JOIN branches ON branches.branch_id = transactions.transaction_branch_id
        LEFT JOIN transaction_payments ON transaction_payment_transaction_id = transaction_id
        ${queryFilter} ${whereSearch}
        ORDER BY ${sort} ${dir}
        ${queryLimit}
      `

      let sqlTotal = `
        SELECT 1 as total 
        FROM transactions
				JOIN branches ON branches.branch_id = transactions.transaction_branch_id
        LEFT JOIN transaction_payments ON transaction_payment_transaction_id = transaction_id
        ${queryFilter} ${whereSearch}
      `

      let result: any = await Database.rawQuery(sql)
      let totalRow = await Database.rawQuery(sqlTotal)
      let resultData: any = result.rowCount > 0 ? Helper.sanitizationResponse(result.rows) : []

      if(resultData.length > 0){
        for(let i in resultData){
          resultData[i].transaction_grand_total = Number(resultData[i].transaction_grand_total)
          // resultData[i].po_total_product = Number(resultData[i].po_total_product)
          resultData[i].transaction_total_qty = Number(resultData[i].transaction_total_qty)
          resultData[i].transaction_total_product_qty = Number(resultData[i].transaction_total_product_qty)
          resultData[i].transaction_total_value = Number(resultData[i].transaction_total_value)
        }
      }

      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          meta: Helper.pagination(totalRow.rowCount, page, limit),
          data: Helper.sanitizationResponse(resultData)
        }
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

	public async widget({ auth, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    try {
      let summary: any = {
        total_transaction_year: 0,
        total_transaction_month: 0,
        total_transaction_week: 0,
        total_transaction_today: 0,
      }

      let queryFilterTrxYear: any
      let queryFilterTrxMonth: any
      let queryFilterTrxWeek: any
      let queryFilterTrxToday: any

      let today = DateTime.local().toFormat('yyyy-MM-dd')
      let week = DateTime.now().weekNumber

      queryFilterTrxYear = `WHERE 1=1 
        AND EXTRACT(year from transaction_order_date) = EXTRACT(YEAR FROM CURRENT_DATE) 
        AND transaction_status = 'completed'
        AND transaction_branch_id = '${auth.user?.user_branch_id}' `

      queryFilterTrxMonth = `WHERE 1=1 
        AND EXTRACT(month from transaction_order_date) = EXTRACT(MONTH FROM CURRENT_DATE) 
        AND transaction_status = 'completed'
        AND transaction_branch_id = '${auth.user?.user_branch_id}' `

      queryFilterTrxWeek = `WHERE 1=1 
        AND EXTRACT(week from transaction_order_date) = '${week}' 
        AND transaction_status = 'completed'
        AND transaction_branch_id = '${auth.user?.user_branch_id}' `

      queryFilterTrxToday = `WHERE 1=1 
        AND transaction_order_date = '${today}' 
        AND transaction_status = 'completed'
        AND transaction_branch_id = '${auth.user?.user_branch_id}' `

      /* get total purchase */
      let queryTrxYear: any = await Database.rawQuery(`
        SELECT 
        CAST(COALESCE(SUM(transaction_grand_total), 0) as bigint) as total_transaction_year
        FROM transactions
        ${queryFilterTrxYear}
      `)
      summary.total_transaction_year = queryTrxYear.rowCount > 0 ? Number(queryTrxYear.rows[0].total_transaction_year) : 0

      let queryTrxMonth: any = await Database.rawQuery(`
        SELECT 
        CAST(COALESCE(SUM(transaction_grand_total), 0) as bigint) as total_transaction_month
        FROM transactions
        ${queryFilterTrxMonth}
      `)
      summary.total_transaction_month = queryTrxMonth.rowCount > 0 ? Number(queryTrxMonth.rows[0].total_transaction_month) : 0
      
      let queryTrxWeek: any = await Database.rawQuery(`
        SELECT 
        CAST(COALESCE(SUM(transaction_grand_total), 0) as bigint) as total_transaction_week
        FROM transactions
        ${queryFilterTrxWeek}
      `)
      summary.total_transaction_week = queryTrxWeek.rowCount > 0 ? Number(queryTrxWeek.rows[0].total_transaction_week) : 0
     
      let queryTrxToday: any = await Database.rawQuery(`
        SELECT 
        CAST(COALESCE(SUM(transaction_grand_total), 0) as bigint) as total_transaction_today
        FROM transactions
        ${queryFilterTrxToday}
      `)
      summary.total_transaction_today = queryTrxToday.rowCount > 0 ? Number(queryTrxToday.rows[0].total_transaction_today) : 0

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

  public async salesChartYear({ auth, request, response}: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let params = request.all()

    try {
      let queryFilter = `WHERE 1 = 1
        AND transaction_status = 'completed'
        AND transaction_branch_id = '${auth.user?.user_branch_id}' `

      if (params.year && params.year.length > 0) {
        queryFilter += `AND EXTRACT(year from transaction_order_date) = '${params.year}' `
      }

      let totalMonth = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
      const newData: any = []
      for(let i in totalMonth){
        let sql = `
          SELECT SUM(transaction_grand_total) as total
          FROM transactions
          ${queryFilter}
          AND EXTRACT(month from transaction_order_date) = '${totalMonth[i]}'
        `

        let result: any = await Database.rawQuery(sql)
        let resultData: any = result.rowCount > 0 ? result.rows[0].total : 0

        let data : any = {
          month: totalMonth[i],
          year: params.year,
          total: resultData ? Number(resultData) : 0
        }

        newData.push(data)
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

  public async salesChartMonth({ auth, request, response}: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let params = request.all()

    try {
      let queryFilter = `WHERE 1 = 1 
        AND transaction_status = 'completed'
        AND transaction_branch_id = '${auth.user?.user_branch_id}' `

      let month = params.month ? params.month : Number(DateTime.local().toFormat('MM'))
      let year = params.year ? params.year : Number(DateTime.local().toFormat('yyyy'))

      let totalDays = new Date(year, month, 0).getDate();
      let startDate = new Date(year +'-'+ month +'-'+ 1)
      let endDate = new Date(year +'-'+ month +'-'+ totalDays)

      const dateRange = Helper.validDatesInRange(startDate, endDate)

      const newData: any = []
      for(let i in dateRange){
        let sql = `
          SELECT SUM(transaction_grand_total) as total
          FROM transactions
          ${queryFilter}
          AND transaction_order_date = '${dateRange[i]}'
          GROUP BY transaction_order_date
        `

        let result: any = await Database.rawQuery(sql)
        let resultData: any = result.rowCount > 0 ? result.rows[0].total : 0

        let data : any = {
          date: dateRange[i],
          total: resultData ? Number(resultData) : 0
        }

        newData.push(data)
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