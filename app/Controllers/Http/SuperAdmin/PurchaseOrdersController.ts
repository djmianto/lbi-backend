import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import PO from 'App/Models/PurchaseOrder'
import PoDetail from 'App/Models/PurchaseOrderDetail'
import PoDetailItem from 'App/Models/PurchaseOrderDetailItem'
import PoReceiving from 'App/Models/PurchaseOrderReceiving'
import PoReceivingDetail from 'App/Models/PurchaseOrderReceivingDetail'
import PoEdit from 'App/Models/PurchaseOrderEdit'
import PoDetailEdit from 'App/Models/PurchaseOrderDetailEdit'
import Helper from 'App/Common/Helper'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import BranchProduct from 'App/Models/BranchProduct'
import BranchProductItem from 'App/Models/BranchProductItem'
import PoPayment from 'App/Models/PurchaseOrderPayment'
import { DateTime } from 'luxon'
import UserLog from 'App/Models/UserLog'
import Excel from 'exceljs'
import Application from '@ioc:Adonis/Core/Application'
import Env from '@ioc:Adonis/Core/Env'

export default class PurchaseOrdersController {
  public async createProforma({ auth, request, response }: HttpContextContract) {
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
        po_id: schema.number(),
        po_total_product: schema.number(),
        po_total_product_qty: schema.number(),
        po_payment_method: schema.enum(['transfer', 'cash']),
        po_subtotal: schema.number(),
        po_grandtotal: schema.number(),
        po_total_value: schema.number(),
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
            po_detail_total_product_length: schema.number(),
            po_detail_product_unit: schema.string(),
            po_detail_qty: schema.number(),
            po_detail_product_purchase_price: schema.number(),
            po_detail_subtotal: schema.number(),
          })
        )
      }),
      reporter: CustomReporter
    })

    try {
      const get_data = await PO.findBy('po_id', payload.po_id)
      if(get_data){
        if(get_data.po_approval_status == "approve"){
          let proforma_number = await Helper.customProformaNumber('PO')

          await PO
            .query()
            .where('po_id', payload.po_id)
            .update({
              po_status: 'waiting',
              po_subtotal: payload.po_subtotal,
              po_grandtotal: payload.po_grandtotal,
              po_total_value: payload.po_total_value,
              po_total_product: payload.po_total_product,
              po_total_product_qty: payload.po_total_product_qty,
              po_payment_method: payload.po_payment_method,
              po_proforma_number: proforma_number,
              po_proforma_datetime: DateTime.local()
            })

          //delete po detail
          await PoDetail
            .query()
            .where('po_detail_po_id', payload.po_id)
            .delete()
    
          dataLoop = payload.items
          for (let i in dataLoop) {
            dataPoDetail.po_detail_po_id = payload.po_id,
            dataPoDetail.po_detail_branch_product_id = dataLoop[i].po_detail_branch_product_id
            dataPoDetail.po_detail_product_name = dataLoop[i].po_detail_product_name
            dataPoDetail.po_detail_product_sku = dataLoop[i].po_detail_product_sku
            dataPoDetail.po_detail_product_weight = dataLoop[i].po_detail_product_weight
            dataPoDetail.po_detail_product_width = dataLoop[i].po_detail_product_width
            dataPoDetail.po_detail_product_unit = dataLoop[i].po_detail_product_unit
            dataPoDetail.po_detail_qty = dataLoop[i].po_detail_qty
            dataPoDetail.po_detail_total_product_length = dataLoop[i].po_detail_total_product_length
            dataPoDetail.po_detail_product_purchase_price = dataLoop[i].po_detail_product_purchase_price
            dataPoDetail.po_detail_subtotal = dataLoop[i].po_detail_subtotal
  
            const createDetail = await PoDetail.create(dataPoDetail)
            
            // Create item
            if(createDetail){
              for(let a = 0; a < dataLoop[i].po_detail_qty; a++){
                await PoDetailItem.create({
                  po_detail_item_po_id: payload.po_id,
                  po_detail_item_po_detail_id: createDetail.$attributes.po_detail_id
                })
              }
            }
          }

          await UserLog.create({
            log_user_id: auth.user?.user_id,
            log_po_id: payload.po_id,
            log_type: 'proforma',
            log_note: `Create Proforma Purchase Order ${proforma_number}`,
          })

          output = {
            code: 201,
            status: 'success',
            message: 'Berhasil tambah data',
            data: payload
          }

        }else{
          throw new Error("Request PO belum di approval!")
        }
      }else{
        throw new Error("Request PO tidak ditemukan!")
      }

    } catch (err) {
      output.message = err.message
      output.code = 500
    }
    return response.status(200).json(output)
  }

  public async indexProforma({ auth, request, response }: HttpContextContract) {
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

      let queryFilter = `WHERE 1 = 1 
        AND po_approval_status = 'approve' 
        AND po_status != 'request' 
        AND po_branch_id = ${auth.user?.user_branch_id}
        `
      if (params.order_date && params.order_date.length > 0) {
        queryFilter += `AND po_date = '${params.order_date}'`
      }

      if (params.status && params.status.length > 0) {
        queryFilter += `AND po_status = '${params.status}'`
      }

      // if (params.branch_id && params.branch_id.length > 0) {
      //   queryFilter += `AND po_branch_id = '${params.branch_id}'`
      // }

      if (params.supplier_id && params.supplier_id.length > 0) {
        queryFilter += `AND po_supplier_id = '${params.supplier_id}'`
      }

      if (params.is_invoice && params.is_invoice.length > 0) {
        queryFilter += `AND po_is_invoice = '${params.is_invoice}'`
      }

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
					AND (
						po_supplier_name ILIKE '%${search}%' OR
						po_proforma_number ILIKE '%${search}%'
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
          po_total_value,
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
          po_is_stock,
          po_is_invoice,
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

      if(resultData.length > 0){
        for(let i in resultData){
          if(resultData[i].total_receiving == 0){
            resultData[i].po_status_receiving = 'not_yet'
          }else{
            resultData[i].po_status_receiving = resultData[i].total_receiving == resultData[i].total_qty ? 'completed' : 'part'
          }
          resultData[i].po_subtotal = Number( resultData[i].po_subtotal)
          resultData[i].po_grandtotal = Number( resultData[i].po_grandtotal)
          resultData[i].po_total_value = Number( resultData[i].po_total_value)
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

  public async EditProforma({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let dataLoop: any
    let payload: any = await request.validate({
      schema: schema.create({
        po_id: schema.number([
          rules.exists({
            table: 'pos',
            column: 'po_id'
          })
        ]),
        po_subtotal: schema.number(),
        po_grandtotal: schema.number(),
        po_total_value: schema.number(),
        po_total_product_qty: schema.number(),
        items: schema.array([
          rules.minLength(1)
        ]).members(
          schema.object().members({
            po_detail_id: schema.number([
              rules.exists({
                table: 'po_details',
                column: 'po_detail_id',
              })
            ]),
            po_detail_branch_product_id: schema.number([
              rules.exists({
                table: 'branch_products',
                column: 'branch_product_id',
              })
            ]),
            po_detail_qty: schema.number(),
            po_detail_total_product_length: schema.number(),
            po_detail_product_purchase_price: schema.number(),
            po_detail_subtotal: schema.number(),
          })
        )
      }),
      reporter: CustomReporter,
      messages: {
        enum: 'harus salah satu dari: {{ options.choices }}'
      }
    })

    try {
      await PO
        .query()
        .where('po_id', payload.po_id)
        .update({
          po_approval_edit: 'waiting',
        })

      let CreateDataEdit = {
        po_edit_po_id: payload.po_id,
        po_edit_total_product_qty: payload.po_total_product_qty,
        po_edit_total_value: payload.po_total_value,
        po_edit_subtotal: payload.po_subtotal,
        po_edit_grandtotal: payload.po_grandtotal,
      }

      const createPoEdit = await PoEdit.create(CreateDataEdit)
      if (createPoEdit) {
        dataLoop = payload.items
        for (let i in dataLoop) {
          const getDetail = await PoDetail.findBy('po_detail_id', dataLoop[i].po_detail_id)

          let CreateDataDetailEdit = {
            po_detail_edit_po_id: payload.po_id,
            po_detail_edit_po_detail_id: dataLoop[i].po_detail_id,
            po_detail_edit_branch_product_id: dataLoop[i].po_detail_branch_product_id,
            po_detail_edit_product_sku: getDetail?.$attributes.po_detail_product_sku,
            po_detail_edit_product_name: getDetail?.$attributes.po_detail_product_name,
            po_detail_edit_product_purchase_price: dataLoop[i].po_detail_product_purchase_price,
            po_detail_edit_qty: dataLoop[i].po_detail_qty,
            po_detail_edit_total_product_length: dataLoop[i].po_detail_total_product_length,
            po_detail_edit_product_length: getDetail?.$attributes.po_detail_product_length,
            po_detail_edit_product_weight: getDetail?.$attributes.po_detail_product_weight,
            po_detail_edit_product_width: getDetail?.$attributes.po_detail_product_width,
            po_detail_edit_product_unit: getDetail?.$attributes.po_detail_product_unit,
            po_detail_edit_subtotal: dataLoop[i].po_detail_subtotal,
          }
    
          await PoDetailEdit.create(CreateDataDetailEdit)
        }

        let data_po = await PO.findBy('po_id', payload.po_id)
        await UserLog.create({
          log_user_id: auth.user?.user_id,
          log_po_id: payload.po_id,
          log_type: 'proforma',
          log_note: `Edit Proforma ${data_po?.$attributes.po_proforma_number}`,
        })
      }

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

  public async approveEditProforma({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let payload: any = await request.validate({
      schema: schema.create({
        po_id: schema.number([
          rules.exists({
            table: 'pos',
            column: 'po_id'
          })
        ]),
      }),
      reporter: CustomReporter,
      messages: {
        enum: 'harus salah satu dari: {{ options.choices }}'
      }
    })

    try {
      const getPoEdit = await PoEdit.findBy('po_edit_po_id', payload.po_id)

      await PO
        .query()
        .where('po_id', payload.po_id)
        .update({
          po_subtotal: getPoEdit?.$attributes.po_edit_subtotal,
          po_grandtotal: getPoEdit?.$attributes.po_edit_grandtotal,
          po_total_value: getPoEdit?.$attributes.po_edit_total_value,
          po_total_product_qty: getPoEdit?.$attributes.po_edit_total_product_qty,
          po_approval_edit: 'approve',
        })

      let sql = `
				SELECT *
				FROM po_detail_edits
        WHERE po_detail_edit_po_id = ${payload.po_id}
      `
      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows : []

      for (let i in resultData) {

        const getDetail = await PoDetail.findBy('po_detail_id', resultData[i].po_detail_edit_po_detail_id)

        if(getDetail?.$attributes.po_detail_qty != resultData[i].po_detail_edit_qty){
          await PoDetailItem
            .query()
            .where('po_detail_item_po_detail_id', getDetail?.$attributes.po_detail_id)
            .delete()
          for(let a = 0; a < resultData[i].po_detail_edit_qty; a++){
            await PoDetailItem.create({
              po_detail_item_po_id: payload.po_id,
              po_detail_item_po_detail_id: getDetail?.$attributes.po_detail_id
            })
          }
        }

        let dataUpdate: any = {
          po_detail_qty: resultData[i].po_detail_edit_qty,
          po_detail_total_product_length: resultData[i].po_detail_edit_total_product_length,
          po_detail_product_purchase_price: resultData[i].po_detail_edit_product_purchase_price,
          po_detail_subtotal: resultData[i].po_detail_edit_subtotal,
        }

        await PoDetail
        .query()
        .where('po_detail_branch_product_id', resultData[i].po_detail_edit_branch_product_id)
        .update(dataUpdate)

      }

      //delete data new edit
      await PoEdit
        .query()
        .where('po_edit_po_id', payload.po_id)
        .delete()

      await PoDetailEdit
        .query()
        .where('po_detail_edit_po_id', payload.po_id)
        .delete()

      let data_po = await PO.findBy('po_id', payload.po_id)
      await UserLog.create({
        log_user_id: auth.user?.user_id,
        log_po_id: payload.po_id,
        log_type: 'proforma',
        log_note: `Approval Edit Proforma ${data_po?.$attributes.po_proforma_number}`,
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

  public async rejectEditProforma({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let payload: any = await request.validate({
      schema: schema.create({
        po_id: schema.number([
          rules.exists({
            table: 'pos',
            column: 'po_id'
          })
        ]),
      }),
      reporter: CustomReporter,
      messages: {
        enum: 'harus salah satu dari: {{ options.choices }}'
      }
    })

    try {
      await PO
        .query()
        .where('po_id', payload.po_id)
        .update({
          po_approval_edit: 'reject',
        })

      //delete data new edit
      await PoEdit
       .query()
       .where('po_edit_po_id', payload.po_id)
       .delete()

     await PoDetailEdit
       .query()
       .where('po_detail_edit_po_id', payload.po_id)
       .delete()

      let data_po = await PO.findBy('po_id', payload.po_id)
      await UserLog.create({
        log_user_id: auth.user?.user_id,
        log_po_id: payload.po_id,
        log_type: 'proforma',
        log_note: `Reject Edit Proforma ${data_po?.$attributes.po_proforma_number}`,
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

  public async updateStatusPayment({ auth,request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      data: {}
    }
    let payload: any = await request.validate({
      schema: schema.create({
        po_id: schema.number(),
        po_payment_status: schema.enum([
          "paid",
          "unpaid",
          "split"
        ] as const),
        po_payment_nominal: schema.number.optional()
      }),
      reporter: CustomReporter,
      messages: {
        enum: "harus salah satu dari: {{ options.choices }}"
      }
    })
    let createPayment: any = {}

    try {
      const getPo = await PO.findBy('po_id', payload.po_id)
      if (getPo?.po_approval_status == 'approve') {
        await PO
          .query()
          .where('po_id', payload.po_id)
          .update({
            po_payment_status: payload.po_payment_status
          })
        if (payload.po_payment_status == 'split') {
          const getPoPayment = await Database
            .query()
            .from('po_payments')
            .where('po_payment_po_id', payload.po_id)
            .orderBy('po_payment_id', 'desc')
            .first()
          if (getPoPayment) {
            if (getPoPayment.po_payment_remaining - payload.po_payment_nominal < 0) {
              throw new Error(`maaf sisa pembayaran ${getPoPayment?.attributes.po_payment_remaining}, nominal yang dimasukkan terlalu besar`)
            }
            createPayment.po_payment_po_id = payload.po_id
            createPayment.po_payment_method = getPo?.$attributes.po_payment_method
            createPayment.po_payment_status = 'split'
            createPayment.po_payment_amount = getPo?.$attributes.po_grandtotal
            createPayment.po_payment_installment = payload.po_payment_nominal
            createPayment.po_payment_remaining = getPoPayment.po_payment_remaining - payload.po_payment_nominal
          } else {
            createPayment.po_payment_po_id = payload.po_id
            createPayment.po_payment_method = getPo?.$attributes.po_payment_method
            createPayment.po_payment_status = 'split'
            createPayment.po_payment_amount = getPo?.$attributes.po_grandtotal
            createPayment.po_payment_installment = payload.po_payment_nominal
            createPayment.po_payment_remaining = getPo?.$attributes.po_grandtotal - payload.po_payment_nominal
          }
        } else {
          createPayment.po_payment_po_id = payload.po_id
          createPayment.po_payment_method = getPo?.po_payment_method
          createPayment.po_payment_status = payload.po_payment_status
          createPayment.po_payment_amount = getPo?.po_grandtotal
          createPayment.po_payment_installment = payload.po_payment_nominal
          createPayment.po_payment_remaining = 0
        }
        const insertPyament = await PoPayment.create(createPayment)
        payload.po_payment = insertPyament

        await UserLog.create({
          log_user_id: auth.user?.user_id,
          log_po_id: payload.po_id,
          log_type: 'proforma',
          log_note: `Update Status Payment Proforma Purchase Order ${getPo?.po_proforma_number} to ${payload.po_payment_status}`,
        })
  
        output.code = 201
        output.status = 'success'
        output.message = 'Berhasil ubah data'
        output.data = payload
      } else {
        output.code = 400
        output.status = 'error'
        output.message = 'Purchase Order menunggu persetujuan'
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async detailProforma({ auth, request, response }: HttpContextContract) {
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

      let queryFilter = `WHERE po_id = ${id} AND po_branch_id = ${auth.user?.user_branch_id}`
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
          po_proforma_datetime,
          po_date,
          po_pic_name,
          po_total_product,
          po_total_product_qty,
          po_total_value,
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
          po_is_stock,
          po_approval_status,
          po_approval_user_id,
          po_approval_user_name,
          po_approval_datetime,
          po_received_datetime,
          po_approval_edit,
          po_created_at,
          po_updated_at,
          (
            SELECT array_to_json(array_agg(t)) 
            FROM (
              SELECT po_detail_id,
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
                product_last_name,
                (
                  SELECT COUNT(po_detail_item_id)
                  FROM po_detail_items
                  WHERE po_detail_item_po_detail_id = po_detail_id
                  AND po_detail_item_product_value > 0
                ) as total_receiving
              FROM po_details
              LEFT JOIN branch_products ON branch_product_id = po_detail_branch_product_id
              LEFT JOIN master_products ON master_products.product_id = branch_products.branch_product_product_id
              WHERE po_details.po_detail_po_id = po_id
            ) t
          ) as product_details,
          (
            SELECT array_to_json(array_agg(t)) 
            FROM (
              SELECT po_detail_edits.*
              FROM po_detail_edits
              WHERE po_detail_edits.po_detail_edit_po_id = po_id
              ORDER BY po_detail_edit_created_at ASC
            ) t
          ) as product_detail_new,
          (
            SELECT array_to_json(array_agg(t)) 
            FROM (
              SELECT po_receivings.*
              FROM po_receivings
              WHERE po_receivings.po_receiving_po_id = po_id
              ORDER BY po_receiving_created_at ASC
            ) t
          ) as po_receivings,
          (
            SELECT array_to_json(array_agg(t)) 
            FROM (
              SELECT *
              FROM po_payments
              WHERE po_payment_po_id = po_id
            ) t
          ) as po_payment
				${from}
				${queryFilter}
			`

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows[0] : {}

      if(result.rowCount > 0){
        if(resultData.po_approval_status == 'approve'){
          if(resultData.product_details.length > 0){
            for(let i in resultData.product_details){
              let sql_detail = `
                SELECT po_detail_items.*,
                  po_detail_branch_product_id,
                  po_detail_product_sku,
                  po_detail_product_name
                FROM po_detail_items
                LEFT JOIN po_details ON po_detail_id = po_detail_item_po_detail_id
                WHERE po_detail_item_po_detail_id = ${resultData.product_details[i].po_detail_id}
                ORDER BY po_detail_item_product_value ASC
              `
              let resultDetail: any = await Database.rawQuery(sql_detail)
              let resultDataDetail = resultDetail.rowCount > 0 ? resultDetail.rows : []
  
              resultData.product_details[i]['items'] = resultDataDetail
            }
          }
        }

        resultData.product_detail_new = resultData.product_detail_new ? resultData.product_detail_new : []
        resultData.po_receivings = resultData.po_receivings ? resultData.po_receivings : []
        resultData.po_payment = resultData.po_payment ? resultData.po_payment : []
      }

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
  
  public async receiving({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      data: {}
    }

    let payload: any = await request.validate({
      schema: schema.create({
        po_id: schema.number(),
        total_qty: schema.number(),
        note: schema.string.optional(),
        items: schema.array().members(
          schema.object().members({
            po_detail_item_id: schema.number(),
            branch_product_id: schema.number(),
            value: schema.number(),
          })
        ),
      })
    })

    try {
      const getDataPO = await Database
        .query()
        .select('po_approval_status', 'po_status', 'po_total_product_qty', 'po_proforma_number')
        .from('pos')
        .where('po_id', payload.po_id)
        .first()

      if(getDataPO.po_approval_status == 'approve'){
        if(getDataPO.po_status != 'received'){
          // insert Po Receiving
          let dataCreate = {
            po_receiving_po_id: payload.po_id,
            po_receiving_total_received: payload.total_qty,
            po_receiving_note: payload.note,
            po_receiving_user_id: auth.user?.user_id
          }
          let insertPoReceiving = await PoReceiving.create(dataCreate)

          let items = payload.items
  
          // Create a map to store quantities and total values by branch_product_id
          const resultMap = new Map<number, { qty: number, total_value: number }>()

          // Iterate through the data and update the map
          items.forEach(async(item:any) => {
            const branchProductId = item.branch_product_id
            const qty = 1
            const value = item.value

            if (resultMap.has(branchProductId)) {
              const existingEntry = resultMap.get(branchProductId)!
              existingEntry.qty += qty
              existingEntry.total_value += value
            } else {
              resultMap.set(branchProductId, { qty, total_value: value })
            }

            await PoDetailItem
              .query()
              .where('po_detail_item_id', item.po_detail_item_id)
              .update({
                'po_detail_item_product_value': item.value,
                'po_detail_item_po_receiving_id': insertPoReceiving.$attributes.po_receiving_id
              })
          })

          // Convert the map to an array of objects
          const modifiedData = Array.from(resultMap, ([branchProductId, { qty, total_value }]) => ({
            branch_product_id: branchProductId,
            qty,
            total_value
          }))
  
          if(modifiedData.length > 0){
            for(let i in modifiedData){
              let sqlPoDetail = `
                SELECT po_detail_product_purchase_price, 
                  po_detail_total_product_length, 
                  po_detail_qty,
                  po_detail_product_unit
                FROM po_details
                WHERE po_detail_po_id = ${payload.po_id}
                AND po_detail_branch_product_id = ${modifiedData[i].branch_product_id}
              `
              let resultPoDetail: any = await Database.rawQuery(sqlPoDetail)
              let resultDataPoDetail = resultPoDetail.rowCount > 0 ? resultPoDetail.rows[0] : {}

              if(resultDataPoDetail){
                await BranchProduct
                  .query()
                  .where('branch_product_id', modifiedData[i].branch_product_id)
                  .update({
                    'branch_product_hpp': resultDataPoDetail.po_detail_product_purchase_price
                  })
              }

              //get data detail receiving
              let sqlDetailReceiving = `
                SELECT 
                  SUM(po_receiving_detail_qty) as po_receiving_detail_qty, 
                  SUM(po_receiving_detail_total_value) as po_receiving_detail_total_value 
                FROM po_receiving_details
                LEFT JOIN po_receivings ON po_receiving_id = po_receiving_detail_po_receiving_id
                WHERE po_receiving_po_id = ${payload.po_id}
                AND po_receiving_detail_branch_product_id = ${modifiedData[i].branch_product_id}
              `
              let resultDetailReceiving: any = await Database.rawQuery(sqlDetailReceiving)
              let resultDataDetailReceiving = resultDetailReceiving.rowCount > 0 ? resultDetailReceiving.rows[0] : {}

              let qty_lack = 0
              let total_value_lack = 0

              if(resultDetailReceiving.rowCount > 0){
                qty_lack = Number(resultDataPoDetail.po_detail_qty) - (Number(modifiedData[i].qty) + Number(resultDataDetailReceiving.po_receiving_detail_qty))
                total_value_lack = Number(resultDataPoDetail.po_detail_total_product_length) - (Number(modifiedData[i].total_value) + Number(resultDataDetailReceiving.po_receiving_detail_total_value))
              }else{
                qty_lack = Number(resultDataPoDetail.po_detail_qty) - Number(modifiedData[i].qty)
                total_value_lack = Number(resultDataPoDetail.po_detail_total_product_length) - Number(modifiedData[i].total_value)
              }

              let detailReceiving = {
                po_receiving_detail_po_receiving_id: insertPoReceiving.$attributes.po_receiving_id,
                po_receiving_detail_branch_product_id: modifiedData[i].branch_product_id,
                po_receiving_detail_qty: modifiedData[i].qty,
                po_receiving_detail_total_value: modifiedData[i].total_value,
                po_receiving_detail_qty_lack: qty_lack,
                po_receiving_detail_total_value_lack: total_value_lack,
                po_receiving_detail_unit: resultDataPoDetail.po_detail_product_unit
              }
              await PoReceivingDetail.create(detailReceiving)
            }
          }

          if(insertPoReceiving){
            let sqlReceiving = `
              SELECT SUM(po_receiving_total_received) as total_received
              FROM po_receivings
              WHERE po_receiving_po_id = ${payload.po_id}
            `
            let resultPoReceiving: any = await Database.rawQuery(sqlReceiving)
            let resultDataPoReceiving = resultPoReceiving.rowCount > 0 ? resultPoReceiving.rows[0] : {}
  
            let total_now = Number(resultDataPoReceiving.total_received)
            let total_lack = 0
  
            if(resultDataPoReceiving.total_received > 0){
              console.log('a')
              total_lack = getDataPO.po_total_product_qty - total_now
            }else{
              console.log('b')
              total_lack = getDataPO.po_total_product_qty - payload.total_qty
            }
  
            //jika total sudah sama dengan qty, maka complete
            // if(total_now === getDataPO.po_total_product_qty){
            //   await PO
            //     .query()
            //     .where('po_id', payload.po_id)
            //     .update({
            //       'po_status': 'received',
            //       'po_received_datetime': DateTime.local()
            //     })
            // }
  
            await PoReceiving
              .query()
              .where('po_receiving_id', insertPoReceiving.$attributes.po_receiving_id)
              .update({
                'po_receiving_total_lack': total_lack,
              })
          }

          await UserLog.create({
            log_user_id: auth.user?.user_id,
            log_po_id: payload.po_id,
            log_type: 'proforma',
            log_note: `Receiving Proforma Purchase Order ${getDataPO.po_proforma_number}`,
          })

          output.code = 201
          output.status = 'success'
          output.message = 'Berhasil ubah data'
          output.data = payload
         
        }else{
          output.code = 400
          output.status = 'error'
          output.message = 'Purchase Order sudah diterima'
        }
      }else{
        output.code = 400
        output.status = 'error'
        output.message = 'Purchase Order menunggu persetujuan'
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async inputStock({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      data: {}
    }

    let payload: any = await request.validate({
      schema: schema.create({
        po_id: schema.number(),
      })
    })

    try {
      const getDataPO = await Database
        .query()
        .select('po_approval_status', 'po_status', 'po_total_product_qty')
        .from('pos')
        .where('po_id', payload.po_id)
        .where('po_branch_id', auth.user?.user_branch_id)
        .first()

      if(getDataPO.po_approval_status == 'approve'){
        // if(getDataPO.po_status != 'received'){

         let sql = `
            SELECT po_detail_item_id,
              po_detail_item_product_value,
              po_detail_branch_product_id
            FROM po_detail_items
            LEFT JOIN po_details ON po_detail_id = po_detail_item_po_detail_id
            WHERE po_detail_item_po_id = ${payload.po_id}
            AND po_detail_item_product_value > 0
            AND po_detail_item_is_stock = 0
          `
          let result: any = await Database.rawQuery(sql)
          let resultData = result.rowCount > 0 ? result.rows : []

          if(result.rowCount > 0){
            for(let i in resultData){

              // get branch product with product_id & value same
              let sql = `
                SELECT 
                  branch_product_item_id, 
                  branch_product_item_branch_product_id,
                  branch_product_item_stock
                FROM branch_product_items
                LEFT JOIN branch_products ON branch_product_item_branch_product_id = branch_product_id
                WHERE branch_product_product_id = (SELECT branch_product_product_id FROM branch_products WHERE branch_product_id = ${resultData[i].po_detail_branch_product_id})
                AND branch_product_item_value = '${resultData[i].po_detail_item_product_value}'
                AND branch_product_item_branch_product_id = '${resultData[i].po_detail_branch_product_id}'
                AND branch_product_status = 'active'
              `

              let resultItem: any = await Database.rawQuery(sql)
              let resultDataItem = resultItem.rowCount > 0 ? resultItem.rows[0] : {}

              if(resultItem.rowCount > 0 ){
                // update hpp & stok
                let newStock = resultDataItem.branch_product_item_stock + 1

                await BranchProductItem
                  .query()
                  .where('branch_product_item_branch_product_id', resultDataItem.branch_product_item_branch_product_id)
                  .where('branch_product_item_value', resultData[i].po_detail_item_product_value)
                  .update({
                    'branch_product_item_stock': newStock,
                  })
  
              }else{
                // create branch product item
                let dataCreate = {
                  branch_product_item_branch_product_id: resultData[i].po_detail_branch_product_id,
                  branch_product_item_stock: 1,
                  branch_product_item_value: resultData[i].po_detail_item_product_value,
                }
  
                await BranchProductItem.create(dataCreate)
              }

              await PoDetailItem
                .query()
                .where('po_detail_item_product_value', resultData[i].po_detail_item_product_value)
                .where('po_detail_item_id', resultData[i].po_detail_item_id)
                .update({
                  'po_detail_item_is_stock': 1
                })
            }
          }

          //update stock branch product
          let sqlDetailPO = `
            SELECT po_detail_branch_product_id
            FROM po_details
            WHERE po_detail_po_id = ${payload.po_id}
          `
          let resultDetailPo: any = await Database.rawQuery(sqlDetailPO)
          let resultDataDetailPo = resultDetailPo.rowCount > 0 ? resultDetailPo.rows : []

          if(resultDetailPo.rowCount > 0){
            for(let i in resultDataDetailPo){
              let sqlBranchProductItem = `
                SELECT SUM(branch_product_item_stock) as total_stock
                FROM branch_product_items
                WHERE branch_product_item_branch_product_id = ${resultDataDetailPo[i].po_detail_branch_product_id}
                GROUP BY branch_product_item_branch_product_id
              `
              let resultPo: any = await Database.rawQuery(sqlBranchProductItem)
              let resultDataPo = resultPo.rowCount > 0 ? resultPo.rows[0] : {}

              if(resultPo.rowCount > 0){
                await BranchProduct
                  .query()
                  .where('branch_product_id', resultDataDetailPo[i].po_detail_branch_product_id)
                  .update({
                    'branch_product_stock': resultDataPo.total_stock,
                  })
              }
            }
          }

          let sqlPoDetail = `
            SELECT SUM(po_detail_item_id) as total
            FROM po_detail_items
            WHERE po_detail_item_po_id = ${payload.po_id}
            AND po_detail_item_is_stock = 0
          `
          let resultPoDetail: any = await Database.rawQuery(sqlPoDetail)
          let resultDataPoDetail = resultPoDetail.rowCount > 0 ? resultPoDetail.rows[0] : {}

          if(resultDataPoDetail.total == 0 || resultDataPoDetail.total == null){
            await PO
              .query()
              .where('po_id', payload.po_id)
              .update({
                'po_is_stock': 1,
                'po_status': 'received',
                'po_received_datetime': DateTime.local()
              })
          }

          // await PO
          //   .query()
          //   .where('po_id', payload.po_id)
          //   .update({
          //     'po_status': 'received',
          //     'po_received_datetime': DateTime.local()
          //   })

          let data_po = await PO.findBy('po_id', payload.po_id)
          await UserLog.create({
            log_user_id: auth.user?.user_id,
            log_po_id: payload.po_id,
            log_type: 'proforma',
            log_note: `Input Stock Proforma Purchase Order ${data_po?.po_proforma_number}`,
          })

          output.code = 201
          output.status = 'success'
          output.message = 'Berhasil ubah data'
          output.data = payload
         
      }else{
        output.code = 400
        output.status = 'error'
        output.message = 'Purchase Order menunggu persetujuan'
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async detailReceiving({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let id: number = request.params().id
    try {
      let from = `FROM po_receivings
      `

      let queryFilter = `WHERE po_receiving_id = ${id} `
      let sql = `
				SELECT 
          po_receivings.*,
          (
            SELECT array_to_json(array_agg(t)) 
            FROM (
              SELECT po_receiving_details.*,
                product_full_name as po_receiving_detail_product_name,
                po_detail_total_product_length
              FROM po_receiving_details
              LEFT JOIN po_receivings ON po_receiving_id = po_receiving_detail_po_receiving_id
              LEFT JOIN branch_products ON po_receiving_detail_branch_product_id = branch_product_id
              LEFT JOIN master_products ON branch_product_product_id = product_id
              LEFT JOIN po_details ON po_receiving_po_id = po_detail_po_id AND po_receiving_detail_branch_product_id = po_detail_branch_product_id
              WHERE po_receiving_details.po_receiving_detail_po_receiving_id = po_receiving_id
              AND po_receiving_detail_po_receiving_id = ${id}
              AND branch_product_branch_id = ${auth.user?.user_branch_id}
            ) t
          ) as receiving_details
				${from}
				${queryFilter}
			`

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows[0] : {}

      if(result.rowCount > 0){
        resultData.receiving_details = resultData.receiving_details ? resultData.receiving_details : []
        if(resultData.receiving_details.length > 0){
          for(let i in resultData.receiving_details){
            let sql_detail = `
              SELECT 
                po_detail_item_id,
                po_detail_item_product_value,
                po_detail_branch_product_id
              FROM po_detail_items
              LEFT JOIN po_details ON po_detail_item_po_detail_id = po_detail_id
              WHERE po_detail_item_po_receiving_id = ${resultData.receiving_details[i].po_receiving_detail_po_receiving_id}
              AND po_detail_branch_product_id = ${resultData.receiving_details[i].po_receiving_detail_branch_product_id}
            `
            let resultDetail: any = await Database.rawQuery(sql_detail)
            let resultDataDetail = resultDetail.rowCount > 0 ? resultDetail.rows : []

            resultData.receiving_details[i]['po_detail_items'] = resultDataDetail
          }
        }
      }

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

  public async updateReceiving({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      data: {}
    }

    let payload: any = await request.validate({
      schema: schema.create({
        po_receiving_id: schema.number(),
        po_id: schema.number(),
        note: schema.string.optional(),
        items: schema.array().members(
          schema.object().members({
            po_detail_item_id: schema.number(),
            branch_product_id: schema.number(),
            value: schema.number(),
          })
        ),
      })
    })

    try {
      const getDataPO = await Database
        .query()
        .select('po_approval_status', 'po_status', 'po_total_product_qty', 'po_proforma_number')
        .from('pos')
        .where('po_id', payload.po_id)
        .where('po_branch_id', auth.user?.user_branch_id)
        .first()

      if(getDataPO.po_approval_status == 'approve'){
        if(getDataPO.po_status != 'received'){

          let items = payload.items

           // Create a map to store quantities and total values by branch_product_id
           const resultMap = new Map<number, { qty: number, total_value: number }>()
  
          items.forEach(async(item:any) => {
            const branchProductId = item.branch_product_id
            const qty = 1
            const value = item.value

            if (resultMap.has(branchProductId)) {
              const existingEntry = resultMap.get(branchProductId)!
              existingEntry.qty += qty
              existingEntry.total_value += value
            } else {
              resultMap.set(branchProductId, { qty, total_value: value })
            }
            
            await PoDetailItem
              .query()
              .where('po_detail_item_id', item.po_detail_item_id)
              .update({
                'po_detail_item_product_value': item.value,
              })
          })

          // Convert the map to an array of objects
          const modifiedData = Array.from(resultMap, ([branchProductId, { qty, total_value }]) => ({
            branch_product_id: branchProductId,
            qty,
            total_value
          }))
  
          if(modifiedData.length > 0){
            for(let i in modifiedData){
              let sqlPoDetail = `
                SELECT po_detail_product_purchase_price, 
                  po_detail_total_product_length, 
                  po_detail_qty,
                  po_detail_product_unit
                FROM po_details
                WHERE po_detail_po_id = ${payload.po_id}
                AND po_detail_branch_product_id = ${modifiedData[i].branch_product_id}
              `
              let resultPoDetail: any = await Database.rawQuery(sqlPoDetail)
              let resultDataPoDetail = resultPoDetail.rowCount > 0 ? resultPoDetail.rows[0] : {}

              //get data detail receiving
              let sqlDetailReceiving = `
                SELECT 
                  SUM(po_receiving_detail_qty) as po_receiving_detail_qty, 
                  SUM(po_receiving_detail_total_value) as po_receiving_detail_total_value 
                FROM po_receiving_details
                LEFT JOIN po_receivings ON po_receiving_id = po_receiving_detail_po_receiving_id
                WHERE po_receiving_po_id = ${payload.po_id}
                AND po_receiving_detail_branch_product_id = ${modifiedData[i].branch_product_id}
              `
              let resultDetailReceiving: any = await Database.rawQuery(sqlDetailReceiving)
              let resultDataDetailReceiving = resultDetailReceiving.rowCount > 0 ? resultDetailReceiving.rows[0] : {}

              //get data detail receiving old
              let sqlDetailReceivingOld = `
                SELECT 
                  po_receiving_detail_total_value 
                FROM po_receiving_details
                WHERE po_receiving_detail_po_receiving_id = ${payload.po_receiving_id}
                AND po_receiving_detail_branch_product_id = ${modifiedData[i].branch_product_id}
              `
              let resultDetailReceivingOld: any = await Database.rawQuery(sqlDetailReceivingOld)
              let resultDataDetailReceivingOld = resultDetailReceivingOld.rowCount > 0 ? resultDetailReceivingOld.rows[0] : {}

              let total_value_lack = 0

              if(resultDetailReceiving.rowCount > 0){
                total_value_lack = Number(resultDataPoDetail.po_detail_total_product_length) - (Number(modifiedData[i].total_value) + Number(resultDataDetailReceiving.po_receiving_detail_total_value)) + Number(resultDataDetailReceivingOld.po_receiving_detail_total_value)
              }else{
                total_value_lack = Number(resultDataPoDetail.po_detail_total_product_length) - (Number(modifiedData[i].total_value) + Number(resultDataDetailReceivingOld.po_receiving_detail_total_value))
              }

              await PoReceivingDetail
                .query()
                .where('po_receiving_detail_po_receiving_id', payload.po_receiving_id)
                .where('po_receiving_detail_branch_product_id', modifiedData[i].branch_product_id)
                .update({
                  'po_receiving_detail_total_value': modifiedData[i].total_value,
                  'po_receiving_detail_total_value_lack': total_value_lack,
                })

            }
          }

          await PoReceiving
            .query()
            .where('po_receiving_id', payload.po_receiving_id)
            .where('po_receiving_po_id', payload.po_id)
            .update({
              'po_receiving_note': payload.note,
            })

          await UserLog.create({
            log_user_id: auth.user?.user_id,
            log_po_id: payload.po_id,
            log_type: 'proforma',
            log_note: `Update Receiving Proforma Purchase Order ${getDataPO.po_proforma_number}`,
          })

          output.code = 201
          output.status = 'success'
          output.message = 'Berhasil ubah data'
          output.data = payload
         
        }else{
          output.code = 400
          output.status = 'error'
          output.message = 'Purchase Order sudah diterima'
        }
      }else{
        output.code = 400
        output.status = 'error'
        output.message = 'Purchase Order menunggu persetujuan'
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async void({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      data: {}
    }

    let payload: any = await request.validate({
      schema: schema.create({
        po_id: schema.number(),
      })
    })

    try {
      let getPO = await PO.findBy('po_id', payload.po_id)

      let sql = `
        SELECT COUNT(po_detail_item_id) as total
        FROM po_detail_items
        WHERE po_detail_item_po_id = ${payload.po_id}
        AND po_detail_item_product_value > 0
      `
      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows[0] : {}

      if(getPO?.$attributes.po_payment_status ==! 'unpaid'){
        throw new Error("PO sudah dibayar!")
      }else if(resultData.total > 0){
          throw new Error("Beberapa Product sudah diterima!")
      }else{
        await PO
          .query()
          .where('po_id', payload.po_id)
          .update({
            po_status: 'cancel'
          })

        await UserLog.create({
          log_user_id: auth.user?.user_id,
          log_po_id: payload.po_id,
          log_type: 'proforma',
          log_note: `Void Proforma Purchase Order ${getPO?.po_proforma_number}`,
        })
  
        output.code = 201
        output.status = 'success'
        output.message = 'Berhasil ubah data'
        output.data = payload
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async updateFinal({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      data: {}
    }

    let payload: any = await request.validate({
      schema: schema.create({
        po_id: schema.number(),
      })
    })

    try {
      const getDataPO = await Database
        .query()
        .select('po_is_stock', 'po_proforma_number')
        .from('pos')
        .where('po_id', payload.po_id)
        .where('po_branch_id', auth.user?.user_branch_id)
        .first()

      if(getDataPO.po_is_stock == 1){

        await PO
          .query()
          .where('po_id', payload.po_id)
          .update({
            'po_is_invoice': 1,
          })

        await UserLog.create({
          log_user_id: auth.user?.user_id,
          log_po_id: payload.po_id,
          log_type: 'proforma',
          log_note: `Update Final Invoice Proforma Purchase Order ${getDataPO.po_proforma_number}`,
        })

        output.code = 201
        output.status = 'success'
        output.message = 'Berhasil ubah data'
        output.data = payload
         
      }else{
        output.code = 400
        output.status = 'error'
        output.message = 'Purchase Order belum dimasukan ke stock'
      }
    } catch (err) {
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
    let queryFilter = `WHERE 1 = 1 AND po_branch_id = ${auth.user?.user_branch_id}`

    if (params.order_date && params.order_date.length > 0) {
      queryFilter += `AND po_date = '${params.order_date}' `
    }

    if (params.po_payment_status && params.po_payment_status.length > 0) {
      queryFilter += `AND po_payment_status = '${params.po_payment_status}' `
    }

    if (params.po_status && params.po_status.length > 0) {
      queryFilter += `AND po_status = '${params.po_status}' `
    }

    if (params.branch_id && params.branch_id.length > 0) {
      queryFilter += `AND po_branch_id = '${params.branch_id}' `
      const getBranch = await Database
        .query()
        .select('branch_name')
        .from('branches')
        .where('branch_id', params.branch_id)
      if(getBranch){
        branch_name = getBranch[0].branch_name
      }
    }

    let whereSearch = ''
    if (search.length > 0) {
      whereSearch += `
        AND (
          po_supplier_name ILIKE '%${search}%' OR
          po_proforma_number ILIKE '%${search}%'
        )
      `
    }

    let sql = `
      SELECT 
        po_branch_id,
        branch_name,
        po_supplier_id,
        po_supplier_name,
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
        po_approval_status,
        po_status
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
        resultData[i].po_date = resultData[i].po_date ? String(await Helper.formatDateNew(resultData[i].po_date)) : '-'
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
  
        worksheet.getCell('A1').value = 'PT. Bakool Nusantara'
        worksheet.getCell('A2').value = 'Data Purchase Order'
        worksheet.getCell('A3').value = '-'
        worksheet.getCell('A4').value = '-'
        worksheet.getCell('A5').value = 'Tags : ' + branch_name
  
        worksheet.getCell('A1').alignment = {
          vertical : "middle", horizontal : "center"
        }
        worksheet.getCell('A2').alignment = {
          vertical : "middle", horizontal : "center"
        }
        
        worksheet.getCell('A3').alignment = {
          vertical : "middle", horizontal : "center"
        }
        worksheet.getCell('A4').alignment = {
          vertical : "middle", horizontal : "center"
        }
        worksheet.getCell('A5').alignment = {
          vertical : "middle", horizontal : "center"
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
					{ header: "Amount (Rp)", key: "po_grandtotal", width: 20, style: { font } },
					{ header: "Payment", key: "po_payment_method", width: 20, style: { font } },
					{ header: "Payment Status", key: "po_payment_status", width: 20, style: { font } },
					{ header: "Status", key: "po_status", width: 20, style: { font } },
          { header: "PT. Bakool Nusantara", key: "", width: 2, style: { font } },
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

  public async exportAccurate({ auth, request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
    let queryFilter = `WHERE 1 = 1 
      AND po_status = 'received'
      AND po_is_stock = '1'
      AND po_is_invoice = '1'
      AND po_branch_id = ${auth.user?.user_branch_id} `

    if(params.arrayId && params.arrayId.length > 0){
      queryFilter += `AND po_id IN (${params.arrayId}) `
    }

    // if (params.branch_id && params.branch_id.length > 0) {
    //   queryFilter += `AND po_branch_id = '${params.branch_id}' `
    // }

    if (params.start_date && params.start_date.length > 0) {
      if (params.end_date && params.end_date.length > 0) {
        queryFilter += `AND po_date BETWEEN '${params.start_date}' AND '${params.end_date}' `
      }
    }

    let sql = `
      SELECT 
        po_id,
        po_branch_id,
        branch_name,
        branch_address,
        po_supplier_id,
        po_supplier_name,
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
        po_approval_status,
        po_status,
        po_created_at,
        (
          SELECT array_to_json(array_agg(t)) 
					FROM (
						SELECT po_details.*
						FROM po_details
						WHERE po_detail_po_id = po_id
					) t
        ) as details
      FROM pos
      JOIN branches ON branch_id = po_branch_id
      ${queryFilter}
      ORDER BY po_id ASC
    `

		let result: any = await Database.rawQuery(sql)
		let resultData: any = result.rowCount > 0 ? result.rows : []
    let newArr: any = []

		if (result.rowCount > 0) {
      for (let i in resultData) {
        let date = resultData[i].po_date
        let year = date.getFullYear()
        let month = String(date.getMonth() + 1).padStart(2, '0')
        let day = String(date.getDate()).padStart(2, '0')
        let po_date_format = day+"/"+month+"/"+year
        resultData[i].po_date_format = po_date_format
        newArr.push(resultData[i])
      }

			try {
				let workbook = new Excel.Workbook()
				let worksheet = workbook.addWorksheet("Sheet 1")

        worksheet.getRow(1).values = [
          "HEADER",
          "No Form",
          "Tgl Pesanan",
          "No Pemasok",
          "Alamat Kirim",
          "Kena PPN",
          "Total Termasuk PPN",
          "Diskon Pesanan (%)",
          "Diskon Pesanan (Rp)",
          "Keterangan",
          "Nama Cabang",
          "Pengiriman",
          "Tgl Pengiriman",
          "FOB",
          "Syarat Pembayaran",
          "Kustom Karakter 1",
          "Kustom Karakter 2",
          "Kustom Karakter 3",
          "Kustom Karakter 4",
          "Kustom Karakter 5",
          "Kustom Karakter 6",
          "Kustom Karakter 7",
          "Kustom Karakter 8",
          "Kustom Karakter 9",
          "Kustom Karakter 10",
          "Kustom Angka 1",
          "Kustom Angka 2",
          "Kustom Angka 3",
          "Kustom Angka 4",
          "Kustom Angka 5",
          "Kustom Angka 6",
          "Kustom Angka 7",
          "Kustom Angka 8",
          "Kustom Angka 9",
          "Kustom Angka 10",
          "Kustom Tanggal 1",
          "Kustom Tanggal 2",
        ];

        worksheet.getRow(2).values = [
          "ITEM",
          "Kode Barang",
          "Nama Barang",
          "Kuantitas",
          "Satuan",
          "Harga Satuan",
          "Diskon Barang (%)",
          "Diskon Barang (Rp)",
          "Catatan Barang",
          "Nama Dept Barang",
          "No Proyek Barang",
          "Nama Gudang",
          "Kustom Karakter 1",
          "Kustom Karakter 2",
          "Kustom Karakter 3",
          "Kustom Karakter 4",
          "Kustom Karakter 5",
          "Kustom Karakter 6",
          "Kustom Karakter 7",
          "Kustom Karakter 8",
          "Kustom Karakter 9",
          "Kustom Karakter 10",
          "Kustom Karakter 11",
          "Kustom Karakter 12",
          "Kustom Karakter 13",
          "Kustom Karakter 14",
          "Kustom Karakter 15",
          "Kustom Angka 1",
          "Kustom Angka 2",
          "Kustom Angka 3",
          "Kustom Angka 4",
          "Kustom Angka 5",
          "Kustom Angka 6",
          "Kustom Angka 7",
          "Kustom Angka 8",
          "Kustom Angka 9",
          "Kustom Angka 10",
          "Kustom Tanggal 1",
          "Kustom Tanggal 2",
          "Kategori Keuangan 1",
          "Kategori Keuangan 2",
          "Kategori Keuangan 3",
          "Kategori Keuangan 4",
          "Kategori Keuangan 5",
          "Kategori Keuangan 6",
          "Kategori Keuangan 7",
          "Kategori Keuangan 8",
          "Kategori Keuangan 9",
          "Kategori Keuangan 10",
        ];

        worksheet.getRow(3).values = [
          "EXPENSE",
          "No Biaya",
          "Nama Biaya",
          "Nilai Biaya",
          "Catatan Biaya",
          "Nama Dept Biaya",
          "No Proyek Biaya",
          "Kategori Keuangan 1",
          "Kategori Keuangan 2",
          "Kategori Keuangan 3",
          "Kategori Keuangan 4",
          "Kategori Keuangan 5",
          "Kategori Keuangan 6",
          "Kategori Keuangan 7",
          "Kategori Keuangan 8",
          "Kategori Keuangan 9",
          "Kategori Keuangan 10",
        ];

        let font = { name: 'Arial', size: 12 }
        worksheet.columns = [
          { key: "header", width: 15, 
            style: { font : {bold: true} }, 
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: '69BE28' }
            } 
          },
          { key: "po_proforma_number", width: 15, style: { font } },
          { key: "po_date", width: 15, style: { font } },
          { key: "po_supplier_name", width: 25, style: { font } },
          { key: "branch_address", width: 22, style: { font } },
          { key: "kena_ppn", width: 15, style: { font } },
          { key: "termasuk_ppn", width: 20, style: { font } },
          { key: "po_disc_percent", width: 25, style: { font } },
          { key: "po_disc_nominal", width: 25, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "branch_name", width: 30, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
          { key: "", width: 15, style: { font } },
        ]

        newArr.map(async (item: any) => {
					worksheet.addRow({
            header: "HEADER",
            po_proforma_number: item.po_proforma_number,
            po_date: item.po_date_format,
            po_supplier_name: item.po_supplier_name,
            branch_address: item.branch_address,
						kena_ppn: "Ya",
						termasuk_ppn: "Tidak",
						faktur_dimuka: "Ya",
            branch_name: item.branch_name,
            // po_account_number: item.po_payment_status == 'paid' ? '11010101' : '',
            // po_grandtotal: item.po_payment_status == 'paid' ? item.po_grandtotal : '',
            po_disc_nominal: item.po_disc_nominal,
            po_disc_percent: item.po_disc_percent
					})
          
          if(item.details.length > 0){
            let dataDetail = item.details
            for (let i in dataDetail) {
              worksheet.columns = [
                { key: "item", width: 15, 
                  style: { font : {bold: true} }, 
                  fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '3DB7E4' }
                  }
                },
                { key: "product_sku", width: 20, style: { font } },
                { key: "product_name", width: 25, style: { font } },
                { key: "product_qty", width: 15, style: { font } },
                { key: "product_unit", width: 15, style: { font } },
                { key: "product_price", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 20, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 20, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
                { key: "", width: 15, style: { font } },
              ]

              worksheet.addRow({
                item: "ITEM",
                product_sku: dataDetail[i].po_detail_product_sku,
                product_name: dataDetail[i].po_detail_product_name,
                product_qty: dataDetail[i].po_detail_qty,
                product_unit: dataDetail[i].po_detail_product_unit,
                product_price: dataDetail[i].po_detail_product_purchase_price,
                product_disc_percent: dataDetail[i].po_detail_disc_percent,
                product_disc_nominal: dataDetail[i].po_detail_disc_nominal,
                product_subtotal: dataDetail[i].po_detail_subtotal,
              })
            }
          }

          worksheet.columns = [
            { key: "expense", width: 15, 
              style: { font : {bold: true} }, 
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF8849' }
              } 
            },
            { key: "", width: 15, style: { font } },
            { key: "nama_biaya", width: 15, style: { font } },
            { key: "nilai_biaya", width: 25, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
            { key: "", width: 15, style: { font } },
          ]
  
          worksheet.addRow({
            expense: "EXPENSE",
            nama_biaya: "Pembayaran",
            nilai_biaya: item.po_grandtotal,
          })
  
				})

        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '69BE28' },
        }

        worksheet.getRow(1).font = {
          name: 'Arial',
          size: 14,
          bold: true
        }

        worksheet.getRow(2).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '3DB7E4' },
        }

        worksheet.getRow(2).font = {
          name: 'Arial',
          size: 14,
          bold: true
        }

        worksheet.getRow(3).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF8849' },
        }

        worksheet.getRow(3).font = {
          name: 'Arial',
          size: 14,
          bold: true
        }

        let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
				let path: string = `PO_Accurate_${datetime}.xlsx`

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
    }else{
      output.code = 404
      output.status = 'error'
      output.message = 'Data tidak ditemukan!'
		}


		return response.status(200).json(output)
	}

}