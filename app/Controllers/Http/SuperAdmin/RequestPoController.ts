import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import PO from 'App/Models/PurchaseOrder'
import PoDetail from 'App/Models/PurchaseOrderDetail'
import Helper from 'App/Common/Helper'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { DateTime } from 'luxon'
import UserLog from 'App/Models/UserLog'

export default class RequestPoController {
  public async createRequest({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let idPo: number
    let dataPoDetail: any = {}
    let dataLoop: any
    let payload: any = await request.validate({
      schema: schema.create({
        // po_branch_id: schema.number(),
        po_supplier_id: schema.number(),
        po_supplier_name: schema.string({}),
        po_date: schema.date({}),
        po_pic_name: schema.string({}),
        po_total_product: schema.number(),
        po_total_product_qty: schema.number(),
        items: schema.array([
          rules.minLength(1)
        ]).members(
          schema.object().members({
            po_detail_branch_product_id: schema.number([
              rules.exists({
                table: 'branch_products',
                column: 'branch_product_id',
              })
            ]),
            po_detail_product_name: schema.string(),
            po_detail_product_sku: schema.string(),
            po_detail_product_weight: schema.number(),
            po_detail_product_width: schema.number(),
            po_detail_product_unit: schema.string(),
            po_detail_qty: schema.number(),
          })
        )
      }),
      reporter: CustomReporter,
      messages: {
        enum: 'harus salah satu dari: {{ options.choices }}'
      }
    })

    try {
      let dataCreate = {
        // po_branch_id: payload.po_branch_id,
        po_branch_id: auth.user?.user_branch_id,
        po_supplier_id: payload.po_supplier_id,
        po_supplier_name: payload.po_supplier_name,
        po_req_number: await Helper.customReqNumber('RP'),
        po_date: payload.po_date,
        po_pic_name: payload.po_pic_name,
        po_total_product: payload.po_total_product,
        po_total_product_qty: payload.po_total_product_qty,
        po_status: 'request',
        po_approval_status: 'waiting',
        po_payment_status: 'unpaid',
      }
      const createPo = await PO.create(dataCreate)
      if (createPo) {
        idPo = createPo.$attributes.po_id
        dataLoop = payload.items
        for (let i in dataLoop) {
          dataPoDetail.po_detail_po_id = idPo
          dataPoDetail.po_detail_branch_product_id = dataLoop[i].po_detail_branch_product_id
          dataPoDetail.po_detail_product_name = dataLoop[i].po_detail_product_name
          dataPoDetail.po_detail_product_sku = dataLoop[i].po_detail_product_sku
          dataPoDetail.po_detail_product_weight = dataLoop[i].po_detail_product_weight
          dataPoDetail.po_detail_product_width = dataLoop[i].po_detail_product_width
          dataPoDetail.po_detail_product_unit = dataLoop[i].po_detail_product_unit
          dataPoDetail.po_detail_qty = dataLoop[i].po_detail_qty

          await PoDetail.create(dataPoDetail)

        }
      }

      await UserLog.create({
        log_user_id: auth.user?.user_id,
        log_po_id: createPo.$attributes.po_id,
        log_type: 'request_po',
        log_note: `Create Request Purchase Order ${createPo.$attributes.po_req_number}`,
      })

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil tambah data',
        result: createPo
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async indexRequest({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let params = request.all()

    try {
      let sort = params.sort ? params.sort : 'po_id'
      let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let search = params.search ? params.search : ''

      let from = `FROM pos
        JOIN branches ON branches.branch_id = pos.po_branch_id
      `

      let queryFilter = `WHERE 1 = 1 AND po_branch_id = ${auth.user?.user_branch_id}`
      if (params.order_date && params.order_date.length > 0) {
        queryFilter += `AND po_date = '${params.order_date}'`
      }

      if (params.branch_id && params.branch_id.length > 0) {
        queryFilter += `AND po_branch_id = '${params.branch_id}'`
      }

      if (params.supplier_id && params.supplier_id.length > 0) {
        queryFilter += `AND po_supplier_id = '${params.supplier_id}'`
      }

      if (params.approval_status && params.approval_status.length > 0) {
        queryFilter += `AND po_approval_status = '${params.approval_status}'`
      }

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
					AND (
						po_supplier_name ILIKE '%${search}%' OR
						po_req_number ILIKE '%${search}%'
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
          po_created_at,
          po_updated_at
				${from}
				${queryFilter} ${whereSearch}
				ORDER BY ${sort} ${dir}
				LIMIT ${limit} OFFSET ${start}
			`

      let sqlTotal = `
				SELECT 1 as total 
				${from}
				${queryFilter} ${whereSearch}
			`
      let result: any = await Database.rawQuery(sql)
      let totalRow = await Database.rawQuery(sqlTotal)
      let resultData = result.rowCount > 0 ? result.rows : []

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

  public async detailRequest({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let id: number = request.params().id
    try {
      let from = `FROM pos
        LEFT JOIN branches ON branches.branch_id = pos.po_branch_id
        LEFT JOIN suppliers ON suppliers.supplier_id = pos.po_supplier_id
      `

      let queryFilter = `WHERE po_id = ${id} AND po_branch_id = ${auth.user?.user_branch_id} `
      let sql = `
				SELECT 
					po_id,
          po_branch_id,
          branch_name,
          po_supplier_id,
          po_supplier_name,
          supplier_phone_number,
          supplier_address,
          supplier_email,
          po_req_number,
          po_proforma_number,
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
          po_status,
          po_is_invoice,
          po_approval_status,
          po_approval_user_id,
          po_approval_user_name,
          po_approval_datetime,
          po_received_datetime,
          po_created_at,
          po_updated_at,
          (
            SELECT array_to_json(array_agg(t)) 
            FROM (
              SELECT 
                po_detail_id,
                po_detail_po_id,
                po_detail_branch_product_id,
                po_detail_product_sku,
                po_detail_product_name,
                po_detail_product_purchase_price,
                po_detail_disc_type,
                po_detail_disc_percent,
                po_detail_disc_nominal,
                po_detail_nett,
                po_detail_qty,
                po_detail_total_product_length,
                po_detail_product_weight,
                po_detail_product_width,
                po_detail_product_unit,
                po_detail_subtotal,
                product_length as po_detail_product_length,
                product_first_name,
                product_last_name
              FROM po_details
              LEFT JOIN branch_products ON branch_product_id = po_detail_branch_product_id
              LEFT JOIN master_products ON master_products.product_id = branch_products.branch_product_product_id
              WHERE po_details.po_detail_po_id = po_id
            ) t
          ) as product_details
				${from}
				${queryFilter}
			`

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows[0] : {}

      output = {
        code: 200,
        status: 'success',
        message: 'Detail data',
        result: Helper.sanitizationResponse(resultData)
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async updateRequest({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let dataPoDetail: any = {}
    let dataLoop: any
    let payload: any = await request.validate({
      schema: schema.create({
        po_id: schema.number([
          rules.exists({
            table: 'pos',
            column: 'po_id'
          })
        ]),
        po_total_product: schema.number(),
        po_total_product_qty: schema.number(),
        items: schema.array([
          rules.minLength(1)
        ]).members(
          schema.object().members({
            po_detail_branch_product_id: schema.number([
              rules.exists({
                table: 'branch_products',
                column: 'branch_product_id',
              })
            ]),
            po_detail_product_name: schema.string(),
            po_detail_product_sku: schema.string(),
            po_detail_product_weight: schema.number(),
            po_detail_product_width: schema.number(),
            po_detail_product_unit: schema.string(),
            po_detail_qty: schema.number(),
          })
        )
      }),
      reporter: CustomReporter,
      messages: {
        enum: 'harus salah satu dari: {{ options.choices }}'
      }
    })

    try {
      let dataUpdate = {
        po_total_product: payload.po_total_product,
        po_total_product_qty: payload.po_total_product_qty,
        po_approval_status: 'waiting'
      }

      const updatePo = await PO
				.query()
				.where('po_id', payload.po_id)
				.update(dataUpdate)

      if (updatePo) {
        await PoDetail
          .query()
          .where('po_detail_po_id', payload.po_id)
          .delete()

        dataLoop = payload.items
        for (let i in dataLoop) {
          dataPoDetail.po_detail_po_id = payload.po_id
          dataPoDetail.po_detail_branch_product_id = dataLoop[i].po_detail_branch_product_id
          dataPoDetail.po_detail_product_name = dataLoop[i].po_detail_product_name
          dataPoDetail.po_detail_product_sku = dataLoop[i].po_detail_product_sku
          dataPoDetail.po_detail_product_weight = dataLoop[i].po_detail_product_weight
          dataPoDetail.po_detail_product_width = dataLoop[i].po_detail_product_width
          dataPoDetail.po_detail_product_unit = dataLoop[i].po_detail_product_unit
          dataPoDetail.po_detail_qty = dataLoop[i].po_detail_qty

          await PoDetail.create(dataPoDetail)

        }
      }

      let data_po = await PO.findBy('po_id', payload.po_id)
      await UserLog.create({
        log_user_id: auth.user?.user_id,
        log_po_id: payload.po_id,
        log_type: 'request_po',
        log_note: `Update Request Purchase Order ${data_po?.$attributes.po_req_number}`,
      })

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil ubah data',
        result: payload
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async approval({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let payload: any = await request.validate({
      schema: schema.create({
        po_id: schema.number(),
        po_approval_status: schema.enum(['approve', 'reject'] as const)
      }),
      reporter: CustomReporter
    })

    try {

      await PO
        .query()
        .where('po_id', payload.po_id)
        .update({
          po_approval_status: payload.po_approval_status,
          po_approval_user_id: auth.user?.user_id,
          po_approval_user_name: auth.user?.user_full_name,
          po_approval_datetime: DateTime.local()
        })

        let data_po = await PO.findBy('po_id', payload.po_id)
        let approve_status = payload.po_approval_status == 'approve' ? 'Approve' : 'Reject'
        await UserLog.create({
          log_user_id: auth.user?.user_id,
          log_po_id: payload.po_id,
          log_type: 'request_po',
          log_note: `${approve_status} Request Purchase Order ${data_po?.$attributes.po_req_number}`,
        })

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil ubah data',
        data: payload
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }
    return response.status(200).json(output)
  }

  public async getLogPo({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let params = request.all()

    try {
      let from = `FROM user_logs
        LEFT JOIN users ON user_id = log_user_id
      `

      let queryFilter = `WHERE log_po_id = ${params.id} AND log_type = '${params.type}' `
      let sql = `
				SELECT 
					log_id,
          log_user_id,
          user_full_name as log_user_name, 
          user_email as log_user_email, 
          log_po_id,
          log_note,
          log_created_at
				${from}
				${queryFilter}
			`

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows : []

      output = {
        code: 200,
        status: 'success',
        message: 'Detail data',
        result: Helper.sanitizationResponse(resultData)
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

}