import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Excel from 'exceljs'
import { DateTime } from 'luxon'
import Application from '@ioc:Adonis/Core/Application'
import Env from '@ioc:Adonis/Core/Env'
import Helper from 'App/Common/Helper'

export default class ReportPurchaseOrdersController {
  public async indexYear({ auth, request, response }: HttpContextContract) {
    let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}
		let params = request.all()

    try{
      let sort = params.sort ? params.sort : ' EXTRACT(month from po_date)'
      let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let queryFilter = `WHERE 1 = 1 AND po_status = 'received' AND po_branch_id = '${auth.user?.user_branch_id}' `

      if (params.year && params.year.length > 0) {
        queryFilter += `AND EXTRACT(year from po_date) = '${params.year}' `
      }

      let querySelect: string = `
        TO_CHAR(po_date, 'Month') as month_label,
        EXTRACT(month from po_date) as month,
        EXTRACT(year from po_date) as year,
        SUM(po_grandtotal) as po_grandtotal, 
        SUM(po_total_value) as po_total_value, 
        COUNT(po_supplier_id) as po_total_supplier, 
        COUNT(po_id) as po_total, 
        SUM(po_total_product) as po_total_product, 
        SUM(po_total_product_qty) as po_total_product_qty
      `

      let sql = `
        SELECT ${querySelect}
        FROM pos
        ${queryFilter} 
        GROUP BY TO_CHAR(po_date, 'Month'), EXTRACT(month from po_date), EXTRACT(year from po_date)
        ORDER BY ${sort} ${dir}
        ${queryLimit}
      `

      let sqlTotal = `
        SELECT 1 as total 
        FROM pos
        ${queryFilter}
        GROUP BY TO_CHAR(po_date, 'Month'), EXTRACT(month from po_date), EXTRACT(year from po_date)
        ORDER BY ${sort} ${dir}
      `

      let result: any = await Database.rawQuery(sql)
      let totalRow = await Database.rawQuery(sqlTotal)
      let resultData: any = result.rowCount > 0 ? Helper.sanitizationResponse(result.rows) : []

      if(resultData.length > 0){
        for(let i in resultData){
          resultData[i].po_grandtotal = Number(resultData[i].po_grandtotal)
          resultData[i].po_total_value = Number(resultData[i].po_total_value)
          resultData[i].po_total_supplier = Number(resultData[i].po_total_supplier)
          resultData[i].po_total = Number(resultData[i].po_total)
          resultData[i].po_total_product = Number(resultData[i].po_total_product)
          resultData[i].po_total_product_qty = Number(resultData[i].po_total_product_qty)
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
      let sort = params.sort ? params.sort : 'po_date'
      let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let queryFilter = `
        WHERE 1 = 1
        AND EXTRACT(year from po_date) = '${params.year}'
        AND EXTRACT(month from po_date) = '${params.month}'
        AND po_status = 'received' 
        AND po_branch_id = ${auth.user?.user_branch_id}
      `

      if (params.supplier_id && params.supplier_id.length > 0) {
        queryFilter += `AND po_supplier_id = '${params.supplier_id}' `
      }

      if (params.start_date && params.start_date.length > 0) {
        if (params.end_date && params.end_date.length > 0) {
          queryFilter += `AND po_date BETWEEN '${params.start_date}' AND '${params.end_date}' `
        }
      }

      let querySelect: string = `
        po_date,
        SUM(po_grandtotal) as po_grandtotal, 
        SUM(po_total_value) as po_total_value, 
        COUNT(po_supplier_id) as po_total_supplier, 
        COUNT(po_id) as po_total, 
        SUM(po_total_product) as po_total_product, 
        SUM(po_total_product_qty) as po_total_product_qty
      `

      let sql = `
        SELECT ${querySelect}
        FROM pos
        ${queryFilter} 
        GROUP BY po_date
        ORDER BY ${sort} ${dir}
        ${queryLimit}
      `

      let sqlTotal = `
        SELECT 1 as total 
        FROM pos
        ${queryFilter}
        GROUP BY po_date
      `

      let result: any = await Database.rawQuery(sql)
      let totalRow = await Database.rawQuery(sqlTotal)
      let resultData: any = result.rowCount > 0 ? Helper.sanitizationResponse(result.rows) : []

      if(resultData.length > 0){
        for(let i in resultData){
          resultData[i].po_grandtotal = Number(resultData[i].po_grandtotal)
          resultData[i].po_total_value = Number(resultData[i].po_total_value)
          resultData[i].po_total_supplier = Number(resultData[i].po_total_supplier)
          resultData[i].po_total = Number(resultData[i].po_total)
          resultData[i].po_total_product = Number(resultData[i].po_total_product)
          resultData[i].po_total_product_qty = Number(resultData[i].po_total_product_qty)

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
      let sort = params.sort ? params.sort : 'po_date'
      let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let search = params.search ? params.search : ''
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let queryFilter = `WHERE 1 = 1 
        AND po_status = 'received' 
        AND po_date = '${params.date}'
        AND po_branch_id = ${auth.user?.user_branch_id}
      `

      if (params.supplier_id && params.supplier_id.length > 0) {
        queryFilter += `AND po_supplier_id = '${params.supplier_id}' `
      }

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
          AND (
            po_proforma_number ILIKE '%${search}%'
          )
        `
      }

      let querySelect: string = `
        po_id,
        po_branch_id,
        branch_name,
        po_supplier_id,
        po_supplier_name,
        po_proforma_number,
        po_proforma_datetime,
        po_date,
        po_pic_name,
        po_total_product,
        po_total_product_qty,
        po_total_value,
        po_grandtotal,
        po_payment_method,
        po_payment_status,
        po_received_datetime,
        po_status,
        po_created_at,
        po_updated_at,
        (
          SELECT COUNT(po_detail_item_id)
          FROM po_detail_items
          WHERE po_detail_item_po_id = po_id
        ) as total_qty,
        (
          SELECT COUNT(po_detail_item_id)
          FROM po_detail_items
          WHERE po_detail_item_po_id = po_id
          AND po_detail_item_product_value > 0
        ) as total_receiving 
      `

      let sql = `
        SELECT ${querySelect}
        FROM pos
        JOIN branches ON branches.branch_id = pos.po_branch_id
        ${queryFilter} ${whereSearch}
        ORDER BY ${sort} ${dir}
        ${queryLimit}
      `

      let sqlTotal = `
        SELECT 1 as total 
        FROM pos
        JOIN branches ON branches.branch_id = pos.po_branch_id
        ${queryFilter} ${whereSearch}
      `

      let result: any = await Database.rawQuery(sql)
      let totalRow = await Database.rawQuery(sqlTotal)
      let resultData: any = result.rowCount > 0 ? Helper.sanitizationResponse(result.rows) : []

      if(resultData.length > 0){
        for(let i in resultData){
          resultData[i].po_grandtotal = Number(resultData[i].po_grandtotal)
          resultData[i].po_total_product = Number(resultData[i].po_total_product)
          resultData[i].po_total_product_qty = Number(resultData[i].po_total_product_qty)
          resultData[i].po_total_value = Number(resultData[i].po_total_value)
          resultData[i].total_qty = Number(resultData[i].total_qty)
          resultData[i].total_receiving = Number(resultData[i].total_receiving)
          if(resultData[i].total_receiving == 0){
            resultData[i].po_status_receiving = 'not_yet'
          }else{
            resultData[i].po_status_receiving = resultData[i].total_receiving == resultData[i].total_qty ? 'completed' : 'part'
          }
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
    // let params = request.all()

    try {
      let summary: any = {
        total_purchase_year: 0,
        total_purchase_month: 0,
        total_purchase_week: 0,
        total_purchase_today: 0,
      }

      let queryFilterPoYear: any
      let queryFilterPoMonth: any
      let queryFilterPoWeek: any
      let queryFilterPoToday: any

      let today = DateTime.local().toFormat('yyyy-MM-dd')
      let week = DateTime.now().weekNumber

      queryFilterPoYear = `WHERE 1=1 
        AND EXTRACT(year from po_date) = EXTRACT(YEAR FROM CURRENT_DATE) 
        AND po_status = 'received'
        AND po_branch_id = ${auth.user?.user_branch_id} `

      queryFilterPoMonth = `WHERE 1=1 
        AND EXTRACT(month from po_date) = EXTRACT(MONTH FROM CURRENT_DATE) 
        AND po_status = 'received'
        AND po_branch_id = ${auth.user?.user_branch_id} `

      queryFilterPoWeek = `WHERE 1=1 
        AND EXTRACT(week from po_date) = '${week}' 
        AND po_status = 'received'
        AND po_branch_id = ${auth.user?.user_branch_id} `

      queryFilterPoToday = `WHERE 1=1 
        AND po_date = '${today}' 
        AND po_status = 'received'
        AND po_branch_id = ${auth.user?.user_branch_id} `

      /* get total purchase */
      let queryPoYear: any = await Database.rawQuery(`
        SELECT 
        CAST(COALESCE(SUM(po_grandtotal), 0) as bigint) as total_purchase_year
        FROM pos
        ${queryFilterPoYear}
      `)
      summary.total_purchase_year = queryPoYear.rowCount > 0 ? Number(queryPoYear.rows[0].total_purchase_year) : 0

      let queryPoMonth: any = await Database.rawQuery(`
        SELECT 
        CAST(COALESCE(SUM(po_grandtotal), 0) as bigint) as total_purchase_month
        FROM pos
        ${queryFilterPoMonth}
      `)
      summary.total_purchase_month = queryPoMonth.rowCount > 0 ? Number(queryPoMonth.rows[0].total_purchase_month) : 0
      
      let queryPoWeek: any = await Database.rawQuery(`
        SELECT 
        CAST(COALESCE(SUM(po_grandtotal), 0) as bigint) as total_purchase_week
        FROM pos
        ${queryFilterPoWeek}
      `)
      summary.total_purchase_week = queryPoWeek.rowCount > 0 ? Number(queryPoWeek.rows[0].total_purchase_week) : 0
     
      let queryPoToday: any = await Database.rawQuery(`
        SELECT 
        CAST(COALESCE(SUM(po_grandtotal), 0) as bigint) as total_purchase_today
        FROM pos
        ${queryFilterPoToday}
      `)
      summary.total_purchase_today = queryPoToday.rowCount > 0 ? Number(queryPoToday.rows[0].total_purchase_today) : 0

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

  public async purchaseChartYear({ auth, request, response}: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let params = request.all()

    try {
      let queryFilter = `WHERE 1 = 1 AND po_status = 'received' AND po_branch_id = ${auth.user?.user_branch_id} `

      if (params.year && params.year.length > 0) {
        queryFilter += `AND EXTRACT(year from po_date) = '${params.year}' `
      }

      let totalMonth = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
      const newData: any = []
      for(let i in totalMonth){
        let sql = `
          SELECT SUM(po_grandtotal) as total
          FROM pos
          ${queryFilter}
          AND EXTRACT(month from po_date) = '${totalMonth[i]}'
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

  public async purchaseChartMonth({ auth, request, response}: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let params = request.all()

    try {
      let queryFilter = `WHERE 1 = 1 AND po_status = 'received' AND po_branch_id = ${auth.user?.user_branch_id} `

      let month = params.month ? params.month : Number(DateTime.local().toFormat('MM'))
      let year = params.year ? params.year : Number(DateTime.local().toFormat('yyyy'))

      let totalDays = new Date(year, month, 0).getDate();
      let startDate = new Date(year +'-'+ month +'-'+ 1)
      let endDate = new Date(year +'-'+ month +'-'+ totalDays)

      const dateRange = Helper.validDatesInRange(startDate, endDate)

      const newData: any = []
      for(let i in dateRange){
        let sql = `
          SELECT SUM(po_grandtotal) as total
          FROM pos
          ${queryFilter}
          AND po_date = '${dateRange[i]}'
          GROUP BY po_date
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

  public async exportExcel({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let params = request.all()
    let search = params.search ? params.search : ''
    let branch_name = 'All'

    let from = `FROM pos
      JOIN branches ON branches.branch_id = pos.po_branch_id
    `
    let queryFilter = `WHERE 1 = 1 AND po_branch_id = ${auth.user?.user_branch_id} `

    if (params.order_date && params.order_date.length > 0) {
      queryFilter += `AND po_date = '${params.order_date}' `
    }

    if (params.po_approval_status && params.po_approval_status.length > 0) {
      queryFilter += `AND po_approval_status = '${params.po_approval_status}' `
    }

    if (params.po_status && params.po_status.length > 0) {
      queryFilter += `AND po_status = '${params.po_status}' `
    }

    if (params.po_payment_status && params.po_payment_status.length > 0) {
      queryFilter += `AND po_payment_status = '${params.po_payment_status}' `
    }

    const getBranch = await Database
      .query()
      .select('branch_name')
      .from('branches')
      .where('branch_id', auth.user?.user_branch_id)
    if (getBranch) {
      branch_name = getBranch[0].branch_name
    }

    let whereSearch = ''
    if (search.length > 0) {
      whereSearch += `
        AND (
          po_supplier_name ILIKE '%${search}%' OR
          po_number ILIKE '%${search}%'
        )
      `
    }

    let sql = `
      SELECT 
        po_id,
        po_branch_id,
        branch_name,
        po_supplier_id,
        po_supplier_name,
        po_req_number,
        po_proforma_number,
        po_date,
        po_pic_name,
        po_total_product,
        po_total_product_qty,
        po_approval_status,
        po_payment_status,
        po_payment_method,
        po_grandtotal,
        po_status,
        po_created_at,
        po_updated_at
      ${from}
      ${queryFilter} ${whereSearch}
      ORDER BY po_id DESC
    `

    let result: any = await Database.rawQuery(sql)
    let resultData: any = result.rowCount > 0 ? result.rows : []
    let newArr: any = []

    if (result.rowCount > 0) {
      for (let i in resultData) {
        resultData[i].po_grandtotal = Number(resultData[i].po_grandtotal)
        resultData[i].po_date = resultData[i].po_date ? String(Helper.formatDateNew(resultData[i].po_date)) : '-'
        newArr.push(resultData[i])
      }

      try {
        let workbook = new Excel.Workbook()
        let worksheet = workbook.addWorksheet("Sheet 1")
        let font = { name: 'Arial', size: 10 }

        worksheet.mergeCells('A1', 'M1')
        worksheet.mergeCells('A2', 'M2')
        worksheet.mergeCells('A3', 'M3')
        worksheet.mergeCells('A4', 'M4')
        worksheet.mergeCells('A5', 'M5')

        worksheet.getCell('A1').value = 'Mataram Textile'
        worksheet.getCell('A2').value = 'Data Purchase Order'
        worksheet.getCell('A3').value = '-'
        worksheet.getCell('A4').value = '-'
        worksheet.getCell('A5').value = 'Tags : ' + branch_name

        worksheet.getCell('A1').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A2').alignment = {
          vertical: "middle", horizontal: "center"
        }

        worksheet.getCell('A3').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A4').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A5').alignment = {
          vertical: "middle", horizontal: "center"
        }

        worksheet.getCell('A1').font = {
          name: 'Arial',
          size: 10,
          bold: true
        };
        worksheet.getCell('A2').font = {
          name: 'Arial',
          size: 12,
          bold: true
        };
        worksheet.getCell('A5').font = {
          name: 'Arial',
          size: 10,
          bold: true
        };

        worksheet.getRow(6).values = [
          "No",
          "Date",
          "Invoice",
          "PIC Name",
          "Supplier",
          "Branch",
          "Total Product",
          "Total Qty Product",
          "Amount (Rp)",
          "Payment",
          "Payment Status",
          "Status",
        ];
        
        worksheet.columns = [
          { header: "No.", key: "no", width: 5, style: { font } },
          { header: "Date", key: "po_date", width: 30, style: { font } },
          { header: "Invoice", key: "po_req_number", width: 30, style: { font } },
          { header: "PIC Name", key: "po_pic_name", width: 30, style: { font } },
          { header: "Supplier", key: "po_supplier_name", width: 25, style: { font } },
          { header: "Branch", key: "branch_name", width: 20, style: { font } },
          { header: "Total Product", key: "po_total_product", width: 20, style: { font } },
          { header: "Total Qty Product", key: "po_total_product_qty", width: 20, style: { font } },
          { header: "Amount (Rp)", key: "po_grandtotal", width: 50, style: { font } },
          { header: "Payment", key: "po_payment_method", width: 20, style: { font } },
          { header: "Payment Status", key: "po_payment_status", width: 20, style: { font } },
          { header: "Status", key: "po_status", width: 20, style: { font } },
          { header: "Mataram Textile", key: "", width: 2, style: { font } },
        ]

        worksheet.getRow(6).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'ECF0F1' },
        }

        worksheet.getRow(6).font = {
          name: 'Arial',
          size: 10,
          bold: true
        }

        let no = 1
        newArr.map(async (item: any) => {
          worksheet.addRow({
            no: no,
            po_date: item.po_date,
            po_number: item.po_number,
            po_pic_name: item.po_pic_name,
            po_supplier_name: item.po_supplier_name,
            branch_name: item.branch_name,
            po_total_product: item.po_total_product,
            po_total_product_qty: item.po_total_product_qty,
            po_grandtotal: item.po_grandtotal,
            po_payment_method: item.po_payment_method,
            po_payment_status: item.po_payment_status,
            po_status: item.po_status,
          })
          no++
        })

        let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
        let path: string = `Data_PO_Export_${datetime}.xlsx`

        await workbook.xlsx.writeFile(Application.tmpPath('uploads/' + path))

        output = {
          code: 200,
          status: 'success',
          message: 'Download Excel',
          result: {
            data: {
              url: Env.get('APP_URL') + '/files/download/' + path
            }
          }
        }
      } catch (error) {
        output.message = error.message
        output.code = 500
      }
    }

    return response.status(200).json(output)
  }

  public async exportExcelPerforma({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let params = request.all()
    let search = params.search ? params.search : ''
    let branch_name = 'All'

    let from = `FROM pos
      JOIN branches ON branches.branch_id = pos.po_branch_id
    `

    let queryFilter = `WHERE 1 = 1 
      AND po_approval_status = 'approve' 
      AND po_status != 'request'
      AND po_branch_id = ${auth.user?.user_branch_id} `

    if (params.order_date && params.order_date.length > 0) {
      queryFilter += `AND po_date = '${params.order_date}'`
    }

    if (params.status && params.status.length > 0) {
      queryFilter += `AND po_status = '${params.status}'`
    }

    if (params.supplier_id && params.supplier_id.length > 0) {
      queryFilter += `AND po_supplier_id = '${params.supplier_id}'`
    }
    if (params.branch_id && params.branch_id.length > 0) {
      queryFilter += `AND po_branch_id = '${params.branch_id}' `
      const getBranch = await Database
        .query()
        .select('branch_name')
        .from('branches')
        .where('branch_id', params.branch_id)
      if (getBranch) {
        branch_name = getBranch[0].branch_name
      }
    }

    let whereSearch = ''
    if (search.length > 0) {
      whereSearch += `
        AND (
          po_supplier_name ILIKE '%${search}%' OR
          po_number ILIKE '%${search}%'
        )
      `
    }

    let sql = `
      SELECT
        po_id,
        po_branch_id,
        branch_name,
        po_supplier_id,
        po_supplier_name,
        po_req_number,
        po_proforma_number,
        po_proforma_datetime,
        po_date,
        po_pic_name,
        po_total_product,
        po_total_product_qty,
        po_subtotal,
        po_disc_type,
        po_disc_percent,
        po_disc_nominal,
        po_shipping_fee,
        po_package_price,
        po_grandtotal,
        po_payment_method,
        po_payment_status,
        po_approval_user_id,
        po_approval_user_name,
        po_approval_datetime,
        po_approval_status,
        po_received_datetime,
        po_status,
        po_created_at,
        po_updated_at,
        (
          SELECT COUNT(po_detail_item_id)
          FROM po_detail_items
          WHERE po_detail_item_po_id = po_id
        ) as total_qty,
        (
          SELECT COUNT(po_detail_item_id)
          FROM po_detail_items
          WHERE po_detail_item_po_id = po_id
          AND po_detail_item_product_value > 0
        ) as total_receiving 
      ${from}
      ${queryFilter} ${whereSearch}
      ORDER BY po_id DESC
    `

    let result: any = await Database.rawQuery(sql)
    let resultData: any = result.rowCount > 0 ? result.rows : []
    let newArr: any = []

    if (result.rowCount > 0) {
      for (let i in resultData) {
        resultData[i].po_grandtotal = Number(resultData[i].po_grandtotal)
        resultData[i].po_date = resultData[i].po_date ? String(Helper.formatDateNew(resultData[i].po_date)) : '-'
        newArr.push(resultData[i])
      }

      try {
        let workbook = new Excel.Workbook()
        let worksheet = workbook.addWorksheet("Sheet 1")
        let font = { name: 'Arial', size: 10 }

        worksheet.mergeCells('A1', 'M1')
        worksheet.mergeCells('A2', 'M2')
        worksheet.mergeCells('A3', 'M3')
        worksheet.mergeCells('A4', 'M4')
        worksheet.mergeCells('A5', 'M5')

        worksheet.getCell('A1').value = 'Mataram Textile'
        worksheet.getCell('A2').value = 'Data Purchase Order Performa'
        worksheet.getCell('A3').value = '-'
        worksheet.getCell('A4').value = '-'
        worksheet.getCell('A5').value = 'Tags : ' + branch_name

        worksheet.getCell('A1').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A2').alignment = {
          vertical: "middle", horizontal: "center"
        }

        worksheet.getCell('A3').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A4').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A5').alignment = {
          vertical: "middle", horizontal: "center"
        }

        worksheet.getCell('A1').font = {
          name: 'Arial',
          size: 10,
          bold: true
        };
        worksheet.getCell('A2').font = {
          name: 'Arial',
          size: 12,
          bold: true
        };
        worksheet.getCell('A5').font = {
          name: 'Arial',
          size: 10,
          bold: true
        };

        worksheet.getRow(6).values = [
          "No",
          "Date",
          "Invoice",
          "PIC Name",
          "Supplier",
          "Branch",
          "Total Product",
          "Total Qty Product",
          "Amount (Rp)",
          "Payment",
          "Payment Status",
          "Status",
        ];

        worksheet.columns = [
          { header: "No.", key: "no", width: 5, style: { font } },
          { header: "Date", key: "po_date", width: 30, style: { font } },
          { header: "Invoice", key: "po_proforma_number", width: 30, style: { font } },
          { header: "PIC Name", key: "po_pic_name", width: 30, style: { font } },
          { header: "Supplier", key: "po_supplier_name", width: 25, style: { font } },
          { header: "Branch", key: "branch_name", width: 20, style: { font } },
          { header: "Total Product", key: "po_total_product", width: 20, style: { font } },
          { header: "Total Qty Product", key: "po_total_product_qty", width: 20, style: { font } },
          { header: "Amount (Rp)", key: "po_grandtotal", width: 50, style: { font } },
          { header: "Payment", key: "po_payment_method", width: 20, style: { font } },
          { header: "Payment Status", key: "po_payment_status", width: 20, style: { font } },
          { header: "Status", key: "po_status", width: 20, style: { font } },
          { header: "Mataram Textile", key: "", width: 2, style: { font } },
        ]

        worksheet.getRow(6).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'ECF0F1' },
        }

        worksheet.getRow(6).font = {
          name: 'Arial',
          size: 10,
          bold: true
        }

        let no = 1
        newArr.map(async (item: any) => {
          worksheet.addRow({
            no: no,
            po_date: item.po_date,
            po_number: item.po_number,
            po_pic_name: item.po_pic_name,
            po_supplier_name: item.po_supplier_name,
            branch_name: item.branch_name,
            po_total_product: item.po_total_product,
            po_total_product_qty: item.po_total_product_qty,
            po_grandtotal: item.po_grandtotal,
            po_payment_method: item.po_payment_method,
            po_payment_status: item.po_payment_status,
            po_status: item.po_status,
          })
          no++
        })

        let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
        let path: string = `Data_PO_Performa_Export_${datetime}.xlsx`

        await workbook.xlsx.writeFile(Application.tmpPath('uploads/' + path))

        output = {
          code: 200,
          status: 'success',
          message: 'Download Excel',
          result: {
            data: {
              url: Env.get('APP_URL') + '/files/download/' + path
            }
          }
        }
      } catch (error) {
        output.message = error.message
        output.code = 500
      }
    }

    return response.status(200).json(output)
  }

  public async exportExcelInvoice({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let params = request.all()
    let search = params.search ? params.search : ''
    let branch_name = 'All'

    let from = `FROM pos
      JOIN branches ON branches.branch_id = pos.po_branch_id
    `
    
    let queryFilter = `WHERE 1 = 1 AND po_is_invoice = 1 AND po_branch_id = ${auth.user?.user_branch_id} `

    if (params.order_date && params.order_date.length > 0) {
      queryFilter += `AND po_date = '${params.order_date}'`
    }

    if (params.supplier_id && params.supplier_id.length > 0) {
      queryFilter += `AND po_supplier_id = '${params.supplier_id}'`
    }

    if (params.approval_status && params.approval_status.length > 0) {
      queryFilter += `AND po_approval_status = '${params.approval_status}'`
    }

    if (params.branch_id && params.branch_id.length > 0) {
      queryFilter += `AND po_branch_id = '${params.branch_id}' `
      const getBranch = await Database
        .query()
        .select('branch_name')
        .from('branches')
        .where('branch_id', params.branch_id)
      if (getBranch) {
        branch_name = getBranch[0].branch_name
      }
    }

    let whereSearch = ''
    if (search.length > 0) {
      whereSearch += `
        AND (
          po_supplier_name ILIKE '%${search}%' OR
          po_number ILIKE '%${search}%'
        )
      `
    }

    let sql = `
      SELECT
        po_id,
        po_branch_id,
        branch_name,
        po_supplier_id,
        po_supplier_name,
        po_req_number,
        po_proforma_number,
        po_proforma_datetime,
        po_date,
        po_pic_name,
        po_total_product,
        po_total_product_qty,
        po_subtotal,
        po_disc_type,
        po_disc_percent,
        po_disc_nominal,
        po_shipping_fee,
        po_package_price,
        po_grandtotal,
        po_payment_method,
        po_payment_status,
        po_approval_user_id,
        po_approval_user_name,
        po_approval_datetime,
        po_approval_status,
        po_received_datetime,
        po_status,
        po_created_at,
        po_updated_at,
        (
          SELECT COUNT(po_detail_item_id)
          FROM po_detail_items
          WHERE po_detail_item_po_id = po_id
        ) as total_qty,
        (
          SELECT COUNT(po_detail_item_id)
          FROM po_detail_items
          WHERE po_detail_item_po_id = po_id
          AND po_detail_item_product_value > 0
        ) as total_receiving
      ${from}
      ${queryFilter} ${whereSearch}
      ORDER BY po_id DESC
    `

    let result: any = await Database.rawQuery(sql)
    let resultData: any = result.rowCount > 0 ? result.rows : []
    let newArr: any = []

    if (result.rowCount > 0) {
      for (let i in resultData) {
        resultData[i].po_grandtotal = Number(resultData[i].po_grandtotal)
        resultData[i].po_date = resultData[i].po_date ? String(Helper.formatDateNew(resultData[i].po_date)) : '-'
        newArr.push(resultData[i])
      }

      try {
        let workbook = new Excel.Workbook()
        let worksheet = workbook.addWorksheet("Sheet 1")
        let font = { name: 'Arial', size: 10 }

        worksheet.mergeCells('A1', 'M1')
        worksheet.mergeCells('A2', 'M2')
        worksheet.mergeCells('A3', 'M3')
        worksheet.mergeCells('A4', 'M4')
        worksheet.mergeCells('A5', 'M5')

        worksheet.getCell('A1').value = 'Mataram Textile'
        worksheet.getCell('A2').value = 'Data Invoice Purchase Order'
        worksheet.getCell('A3').value = '-'
        worksheet.getCell('A4').value = '-'
        worksheet.getCell('A5').value = 'Tags : ' + branch_name

        worksheet.getCell('A1').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A2').alignment = {
          vertical: "middle", horizontal: "center"
        }

        worksheet.getCell('A3').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A4').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A5').alignment = {
          vertical: "middle", horizontal: "center"
        }

        worksheet.getCell('A1').font = {
          name: 'Arial',
          size: 10,
          bold: true
        };
        worksheet.getCell('A2').font = {
          name: 'Arial',
          size: 12,
          bold: true
        };
        worksheet.getCell('A5').font = {
          name: 'Arial',
          size: 10,
          bold: true
        };

        worksheet.getRow(6).values = [
          "No",
          "Tanggal PO",
          "Invoice",
          "Supplier",
          "Metode Bayar",
          "Penerimaan",
          "Total (Rp)",
          "Status Pembayaran",
          "status"
        ];

        worksheet.columns = [
          { header: "No.", key: "no", width: 5, style: { font } },
          { header: "Tanggal PO", key: "po_date", width: 30, style: { font } },
          { header: "Invoice", key: "po_proforma_number", width: 30, style: { font } },
          { header: "Supplier", key: "po_supplier_name", width: 25, style: { font } },
          { header: "Metode Bayar", key: "po_payment_method1", width: 20, style: { font } },
          { header: "Penerimaan", key: "po_payment_method2", width: 25, style: { font } },
          { header: "Total (Rp)", key: "po_grandtotal", width: 50, style: { font } },
          { header: "Status Pembayaran", key: "po_payment_status", width: 20, style: { font } },
          { header: "Status", key: "po_status", width: 20, style: { font } }
        ]

        worksheet.getRow(6).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'ECF0F1' },
        }

        worksheet.getRow(6).font = {
          name: 'Arial',
          size: 10,
          bold: true
        }

        let no = 1
        newArr.map(async (item: any) => {
          worksheet.addRow({
            no: no,
            po_date: item.po_date,
            po_proforma_number: item.po_proforma_number,
            po_supplier_name: item.po_supplier_name,
            po_payment_method1: item.po_payment_method,
            po_payment_method2: item.po_payment_method,
            po_grandtotal: item.po_grandtotal,
            po_payment_status: item.po_payment_status,
            po_status: item.po_status
          })
          no++
        })

        let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
        let path: string = `Data_PO_Invoice_Export_${datetime}.xlsx`

        await workbook.xlsx.writeFile(Application.tmpPath('uploads/' + path))

        output = {
          code: 200,
          status: 'success',
          message: 'Download Excel',
          result: {
            data: {
              url: Env.get('APP_URL') + '/files/download/' + path
            }
          }
        }
      } catch (error) {
        output.message = error.message
        output.code = 500
      }
    }

    return response.status(200).json(output)
  }
  
}
