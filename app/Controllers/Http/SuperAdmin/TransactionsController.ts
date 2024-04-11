import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Helper from 'App/Common/Helper'
import Branch from 'App/Models/Branch'
import BranchProductItem from 'App/Models/BranchProductItem'
// import StockLog from 'App/Models/StockLog'
import Transaction from 'App/Models/Transaction'
import TransactionDetail from 'App/Models/TransactionDetail'
import TransactionPayment from 'App/Models/TransactionPayment'
import UserLog from 'App/Models/UserLog'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { DateTime } from 'luxon'
import Excel from 'exceljs'
import Application from '@ioc:Adonis/Core/Application'
// import Stock from 'App/Models/Stock'
// import TransactionStatus from 'App/Models/TransactionStatus'
import Env from '@ioc:Adonis/Core/Env'

export default class TransactionsController {
  public async create({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let transId: number = 0
    let payload: any = {}

    try {
      payload = await request.validate({
        schema: schema.create({
          data: schema.object().members({
            user_id: schema.number([
              rules.exists({
                table: 'users',
                column: 'user_id',
              })
            ]),
            user_full_name: schema.string(),
            address_full: schema.string.optional(),
            user_phone_number: schema.string.optional(),
            address_id: schema.number([
              rules.exists({
                table: 'user_addresses',
                column: 'address_id',
              })
            ]),
						pic_name: schema.string.optional(),
          }),
          items: schema.array([
            rules.minLength(1)
          ]).members(
            schema.object().members({
              branch_product_item_id: schema.number([
                rules.exists({
                  table: 'branch_product_items',
                  column: 'branch_product_item_id',
                })
              ]),
              product_name: schema.string(),
              product_sku: schema.string(),
              product_unit: schema.string({ escape: true, trim: true }),
              qty: schema.number(),
              total_value: schema.number(),
              branch_product_disc_percent: schema.number(),
							branch_product_sell_price: schema.number(),
              branch_product_sale_price: schema.number(),
              total_price: schema.number(),
              discount_nominal_unit: schema.number(),
              transaction_detail_value_arr: schema.string.optional(),
            })
          ),
          note: schema.string.optional(),
          payment_metode: schema.enum(['cash', 'transfer'] as const),
          discount: schema.number.optional(),
          shipping_fee: schema.number.optional(),
          sub_total: schema.number(),
          total_payment: schema.number(),
          transaction_total_value: schema.number(),
          transaction_date: schema.string.optional(),
        }),
        reporter: CustomReporter,
        messages: {
          enum: "harus salah satu dari: {{ options.choices }}"
        }
      })
    } catch (error) {
      return response.status(200).json(error.messages)
    }
    
    const getBranch = await Branch.findBy('branch_id', auth.user?.user_branch_id)

    const trx = await Database.transaction({ isolationLevel: 'read uncommitted' })
    let checkStock: any = await this.getStock(payload.items)
    if (checkStock) {
			try {
				/*count total qty items and collect id*/
				let totalQty: number = 0
				let arrItemsId: any = []
				payload.items.forEach((item: { qty: number; branch_product_item_id: number; }) => {
					totalQty += item.qty
					arrItemsId.push(item.branch_product_item_id)
				})
	
				let insertData: any = {
					transaction_code: await Helper.randomNumberTrans(getBranch?.$attributes.branch_id),
					transaction_branch_id: getBranch?.$attributes.branch_id,
					transaction_branch_name: getBranch?.$attributes.branch_name,
					transaction_customer_id: payload.data.user_id,
					transaction_customer_name: payload.data.user_full_name,
					transaction_customer_address_order: payload.data.address_full,
					transaction_customer_phone_number: payload.data.user_phone_number,
					transaction_shipping_cost: payload.shipping_fee,
					transaction_total_qty: totalQty,
					transaction_sub_total: payload.sub_total,
					transaction_disc_nominal: payload.discount,
					transaction_grand_total: payload.total_payment,
					transaction_total_value: payload.transaction_total_value,
					transaction_value_detail: payload.transaction_value_detail,
					transaction_status: 'waiting',
					transaction_note: payload.note,
					transaction_order_date: payload.transaction_date,
          transaction_pic_name: payload.data.pic_name
				}

				/*insert transaction*/
				const create = await Transaction.create(insertData)
	
				if (!create) {
					throw new Error("Gagal tambah transaksi")
				}
				transId = create.$original.transaction_id
				let insertTransactionDetail: any = []
				payload.items.forEach((item: any) => {
					insertTransactionDetail.push({
						transaction_detail_transaction_id: transId,
						transaction_detail_branch_product_item_id: item.branch_product_item_id,
						transaction_detail_product_sku: item.product_sku,
						transaction_detail_product_name: item.product_name,
						transaction_detail_price_unit: item.branch_product_sell_price,
						transaction_detail_qty: item.qty,
						transaction_detail_total_value: item.total_value,
						transaction_detail_discount_type: item.branch_product_disc_percent > 0 ? 'percent' : 'nominal',
						transaction_detail_discount_amount: item.branch_product_disc_percent,
						transaction_detail_discount_nominal: item.discount_nominal_unit,
						transaction_detail_total_price: item.total_price,
						transaction_detail_product_unit: item.product_unit,
						transaction_detail_price_unit_after_discount: item.branch_product_sale_price,
						transaction_detail_value_arr: item.transaction_detail_value_arr
					})
				})
	
				const createDetail = await TransactionDetail.createMany(insertTransactionDetail)
				if (!createDetail) {
					throw new Error("Gagal tambah detail transaksi")
				}

				let insertPayment = {
					transaction_payment_transaction_id: transId,
					transaction_payment_method: payload.payment_metode,
					transaction_payment_amount: payload.total_payment,
					transaction_payment_image: '',
					transaction_payment_status: 'pending'
				}
	
				const createPayment = await TransactionPayment.create(insertPayment)
				if (!createPayment) {
					throw new Error("Gagal tambah payment")
				}
	
				let sql = `
					SELECT transactions.*, 
					(
						SELECT array_to_json(array_agg(t)) 
						FROM (
							SELECT * 
							FROM transaction_details
							WHERE transaction_detail_transaction_id = transaction_id
						) t
					) as transaction_detail
					FROM transactions
					WHERE transaction_id = '${transId}'
				`
	
				let result: any = await Database.rawQuery(sql)
				let resultData = result.rowCount > 0 ? result.rows[0] : {}
	
				if (result.rowCount > 0) {
					resultData.transaction_sub_total = Number(resultData.transaction_sub_total)
					resultData.transaction_disc_nominal = Number(resultData.transaction_disc_nominal)
					resultData.transaction_grand_total = Number(resultData.transaction_grand_total)
					resultData.transaction_payment_amount = resultData.transaction_payment_amount ? Number(resultData.transaction_payment_amount) : 0
				}
	
        await UserLog.create({
          log_user_id: auth.user?.user_id,
          log_transaction_id: transId,
          log_type: 'transaction',
          log_note: `Create Transaction ${create.$original.transaction_code}`,
        })

        await trx.commit()
				output = {
					code: 201,
					status: 'success',
					message: 'Berhasil tambah data',
					result: {
						data: Helper.sanitizationResponse(resultData)
					}
				}
			} catch (error) {
				await trx.rollback()
				await Transaction.query().where('transaction_id', transId).delete()
				await TransactionDetail.query().where('transaction_detail_transaction_id', transId).delete()
				output.message = error.message
				output.code = 500
			}
    } else {
      await trx.commit()
      output = {
        code: 404,
        status: 'error',
        message: 'Maaf stok habis/tidak tersedia'
      }
    }

		/* update stock*/
		if (output.code == 201) {
			await this.updateStock(payload.items)
		}

    return response.status(200).json(output)
  }

	async getStock(data: any) {
    let status:Boolean = false
    let countItem = 0

    for (let i in data) {
      const getStockBranch = await Database
      .query()
      .select('branch_product_item_stock')
      .from('branch_product_items')
      .where('branch_product_item_id', data[i].branch_product_item_id)
      .first()
      
      if (getStockBranch.branch_product_item_stock >= data[i].qty ) {
        countItem++
      }
    }

    if(countItem == data.length){
      status = true
    }else{
      status =  false
    }
    return status
  }

	async updateStock(data: any) {
    for (let i in data) {
			let getStockBranch: any = await Database
				.query()
				.select('branch_product_item_stock')
				.from('branch_product_items')
				.where('branch_product_item_id', data[i].branch_product_item_id)
				.first()

			await BranchProductItem
				.query()
				.where('branch_product_item_id', data[i].branch_product_item_id)
				.update({
					branch_product_item_stock: parseInt(getStockBranch.branch_product_item_stock) - parseInt(data[i].qty)
				})
          
    }
    return true
  }

	public async index({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let params = request.all()

    try {
      let sort = params.sort ? params.sort : 'transaction_id'
      let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let search = params.search ? params.search : ''
      let queryFilter = `WHERE 1 = 1 AND transaction_branch_id = ${auth.user?.user_branch_id} ` 

      // if (params.branch_id && params.branch_id.length > 0) {
      //   queryFilter += `AND transaction_branch_id = '${params.branch_id}' `
      // }

      if (params.user_id && params.user_id.length > 0) {
        queryFilter += `AND transaction_customer_id = '${params.user_id}' `
      }

      if (params.payment_status && params.payment_status.length > 0) {
        queryFilter += `AND transaction_payment_status = '${params.payment_status}'`
      }

      if (params.status && params.status.length > 0) {
        queryFilter += `AND transaction_status = '${params.status}'`
      }
      
      if (params.date && params.date.length > 0) {
        queryFilter += `AND transaction_order_date = '${params.date}' `
      }

      if (params.payment_method && params.payment_method.length > 0) {
        queryFilter += `AND transaction_payment_method = '${params.payment_method}'`
      }

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
				AND (
            transaction_code ILIKE '%${search}%' OR
            transaction_customer_name ILIKE '%${search}%' OR
            user_full_name ILIKE '%${search}%' OR
            transaction_customer_phone_number ILIKE '%${search}%'
				) `
      }

      let sql = `
        SELECT transactions.*,
					transaction_payments.*,
          branch_name as transaction_branch_name
        FROM transactions
				JOIN transaction_payments ON transaction_id = transaction_payment_transaction_id
        LEFT JOIN branches ON branch_id = transaction_branch_id
				${queryFilter} ${whereSearch}
				ORDER BY ${sort} ${dir}
				${queryLimit}
			`

      let sqlTotal = `
				SELECT 1 as total
				FROM transactions
				JOIN transaction_payments ON transaction_id = transaction_payment_transaction_id
        LEFT JOIN branches ON branch_id = transaction_branch_id
				${queryFilter} ${whereSearch}
			`

      let result: any = await Database.rawQuery(sql)
      let totalRow = await Database.rawQuery(sqlTotal)
      let resultData = result.rowCount > 0 ? result.rows : []

      resultData.forEach((item: any, index: number) => {
        resultData[index].transaction_sub_total = Number(item.transaction_sub_total)
        resultData[index].transaction_disc_nominal = Number(item.transaction_disc_nominal)
        resultData[index].transaction_grand_total = Number(item.transaction_grand_total)
        resultData[index].transaction_total_value = Number(item.transaction_total_value)
        resultData[index].transaction_payment_amount = resultData[index].transaction_payment_amount ? Number(resultData[index].transaction_payment_amount) : 0
      })

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

	public async detail({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let id: number = request.params().id

    try {
      let sql = `
        SELECT 
          transactions.*,
          transaction_payments.*,
          branch_name as transaction_branch_name,
          (
            SELECT array_to_json(array_agg(t)) 
            FROM (
              SELECT
                b.transaction_detail_transaction_id,
                b.transaction_detail_product_sku,
                b.transaction_detail_product_name,
                b.transaction_detail_price_unit,
                SUM(b.transaction_detail_qty) as transaction_detail_qty,
                SUM(b.transaction_detail_total_price) as transaction_detail_total_price,
                b.transaction_detail_product_unit,
                SUM(b.transaction_detail_total_value) as transaction_detail_total_value,
                product_last_name as transaction_detail_product_last_name,
                product_default_value,
                (
                  SELECT array_to_json(array_agg(t)) 
                  FROM (
                    SELECT a.transaction_detail_value_arr
                    FROM transaction_details a
                    WHERE a.transaction_detail_transaction_id = b.transaction_detail_transaction_id
                    AND a.transaction_detail_product_sku = b.transaction_detail_product_sku
                  ) t
                ) as transaction_detail_value_arr
              FROM transaction_details b
              LEFT JOIN branch_product_items ON transaction_detail_branch_product_item_id = branch_product_item_id
              LEFT JOIN branch_products ON branch_product_item_branch_product_id = branch_product_id
              LEFT JOIN master_products ON branch_product_product_id = product_id
              WHERE transaction_detail_transaction_id = transaction_id
              GROUP BY 
                transaction_detail_transaction_id,
                transaction_detail_product_sku,
                transaction_detail_product_name,
                transaction_detail_price_unit,
                transaction_detail_product_unit,
                product_last_name,
                product_default_value
            ) t
          ) as transaction_detail
        FROM transactions
        JOIN transaction_payments ON transaction_payment_transaction_id = transaction_id
        LEFT JOIN branches ON branch_id = transaction_branch_id
        WHERE transaction_id = '${id}'
        AND transaction_branch_id = ${auth.user?.user_branch_id}
			`

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows[0] : {}

      if (result.rowCount > 0) {
        resultData.transaction_sub_total = Number(resultData.transaction_sub_total)
        resultData.transaction_disc_nominal = Number(resultData.transaction_disc_nominal)
        resultData.transaction_grand_total = Number(resultData.transaction_grand_total)
        resultData.transaction_total_value = Number(resultData.transaction_total_value)
				resultData.transaction_payment_amount = resultData.transaction_payment_amount ? Number(resultData.transaction_payment_amount) : 0

        for(let i in resultData.transaction_detail) {
          let valueArr = resultData.transaction_detail[i].transaction_detail_value_arr
          let parsedValues: number[] = []

          for (const obj of valueArr) {
            // Access the transaction_detail_value_arr property and parse it as JSON
            const valueArray = JSON.parse(obj.transaction_detail_value_arr);
          
            // Append the parsed values to the parsedValues array
            parsedValues.push(...valueArray);
          }
          resultData.transaction_detail[i].transaction_detail_value_arr = parsedValues           
        }
      }

      output = {
        code: 200,
        status: 'success',
        message: 'Detail data',
        result: Helper.sanitizationResponse(resultData)
      }
    } catch (error) {
      output.message = error.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async void({ auth, request, response}: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    const transactionId = request.input('transaction_id')
    let payload: any = await request.validate({
      schema: schema.create({
        transaction_id: schema.number([rules.exists({ table: 'transactions', column: 'transaction_id' })]),
        transaction_status: schema.enum(['cancel'] as const)
      }),
      reporter: CustomReporter,
      messages: {
        enum: "harus salah satu dari: {{ options.choices }}"
      }
    })

    try {
      //get data transaction
      const transaction: any = await Transaction.findBy('transaction_id', transactionId)

      if (transaction.transaction_status == 'cancel') {
        output.message = 'Transaksi sudah dibatalkan'
        output.code = 400
      } else {
        await Transaction
          .query()
          .where('transaction_id', transactionId)
          .update({
            transaction_status: 'cancel'
          })

        let sql = `
            SELECT transactions.*, transaction_payments.*,
            (
              SELECT array_to_json(array_agg(t)) 
              FROM (
                SELECT transaction_details.*,
                (branch_product_item_stock + transaction_detail_qty) as added_stock
                FROM transaction_details
                JOIN branch_product_items ON branch_product_item_id = transaction_detail_branch_product_item_id
                WHERE transaction_detail_transaction_id = transaction_id
              ) t
            ) as transaction_detail
            FROM transactions
            JOIN transaction_payments ON transaction_payment_transaction_id = transaction_id
            WHERE transaction_id = '${transactionId}'
          `
  
        let result: any = await Database.rawQuery(sql)
        let resultData = result.rowCount > 0 ? result.rows[0] : {}
  
        if (result.rowCount > 0) {
          resultData.transaction_sub_total = Number(resultData.transaction_sub_total)
          resultData.transaction_disc_nominal = Number(resultData.transaction_disc_nominal)
          resultData.transaction_grand_total = Number(resultData.transaction_grand_total)
          resultData.transaction_payment_amount = Number(resultData.transaction_payment_amount)
          await TransactionPayment
            .query()
            .where('transaction_payment_transaction_id', transactionId)
            .update({
              transaction_payment_status: 'unpaid'
            })

          resultData.transaction_detail.forEach(async (item: any) => {
            /* give back stock branch product*/
            await BranchProductItem
              .query()
              .where('branch_product_item_id', item.transaction_detail_branch_product_item_id)
              .update({ branch_product_item_stock: item.added_stock })
  
          })
        }

        let data_trx = await Transaction.findBy('transaction_id', transactionId)
        await UserLog.create({
          log_user_id: auth.user?.user_id,
          log_transaction_id: transactionId,
          log_type: 'transaction',
          log_note: `Void Transaction ${data_trx?.transaction_code}`,
        })
  
        output = {
          code: 200,
          status: 'success',
          message: 'Berhasil ubah data',
          result: {
            data: Helper.sanitizationResponse(payload)
          }
        }
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }
    return response.status(200).json(output)
  }

  public async makePayment({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    const transactionId = request.input('transaction_id')

    let payload: any = {}

    payload = await request.validate({
      schema: schema.create({
        transaction_id: schema.number([rules.exists({ table: 'transactions', column: 'transaction_id' })]),
        transaction_payment_status: schema.enum(['paid'] as const)
      }),
      reporter: CustomReporter,
      messages: {
        enum: "harus salah satu dari: {{ options.choices }}"
      }
    })
    
    try {
      //get data transaction
      const transaction: any = await Transaction.findBy('transaction_id', transactionId)

      if (transaction) {
        if (transaction.transaction_status === 'cancel') {
          output.message = 'Pesanan telah dibatalkan sebelumnya'
          output.code = 400
          return response.status(200).json(output);
        }

        await TransactionPayment
          .query()
          .where('transaction_payment_transaction_id', transactionId)
          .update({
            transaction_payment_datetime: DateTime.local(), 
            transaction_payment_status: payload.transaction_payment_status 
          })
      }

      let data_trx = await Transaction.findBy('transaction_id', transactionId)
      await UserLog.create({
        log_user_id: auth.user?.user_id,
        log_transaction_id: transactionId,
        log_type: 'transaction',
        log_note: `Update Payment Transaction ${data_trx?.transaction_code}`,
      })

      output = {
        code: 200,
        status: 'success',
        message: 'Berhasil ubah data',
        result: {
          data: Helper.sanitizationResponse(payload)
        }
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async updateStatus({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    const transactionId = request.input('transaction_id')
    let payload: any = {}

    payload = await request.validate({
      schema: schema.create({
        transaction_id: schema.number([rules.exists({ table: 'transactions', column: 'transaction_id' })]),
        transaction_status: schema.enum(['processing', 'completed'] as const),
      }),
      reporter: CustomReporter,
      messages: {
        enum: "harus salah satu dari: {{ options.choices }}"
      }
    })

    try {
      await Transaction
        .query()
        .where('transaction_id', transactionId)
        .update({
          transaction_status: payload.transaction_status
        })

      let data_trx = await Transaction.findBy('transaction_id', transactionId)
      await UserLog.create({
        log_user_id: auth.user?.user_id,
        log_transaction_id: transactionId,
        log_type: 'transaction',
        log_note: `Update Status Transaction ${data_trx?.transaction_code} to ${payload.transaction_status}`,
      })
      
      output = {
        code: 200,
        status: 'success',
        message: 'Berhasil ubah data',
        result: {
          data: Helper.sanitizationResponse(payload)
        }
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async getLogTrx({ request, response }: HttpContextContract) {
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

      let queryFilter = `WHERE log_transaction_id = ${params.id} AND log_type = 'transaction' `
      let sql = `
				SELECT 
					log_id,
          log_user_id,
          user_full_name as log_user_name,
          user_email as log_user_email,
          log_transaction_id,
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

  public async exportAccurate({ auth, request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
    let queryFilter = `WHERE 1 = 1 
      AND transaction_status = 'completed'
      AND transaction_branch_id = ${auth.user?.user_branch_id} `

    if(params.arrayId && params.arrayId.length > 0){
      queryFilter += `AND transaction_id IN (${params.arrayId}) `
    }

    // if (params.branch_id && params.branch_id.length > 0) {
    //   queryFilter += `AND transaction_branch_id = '${params.branch_id}' `
    // }

    if (params.start_date && params.start_date.length > 0) {
      if (params.end_date && params.end_date.length > 0) {
        queryFilter += `AND transaction_order_date BETWEEN '${params.start_date}' AND '${params.end_date}' `
      }
    }

    let sql = `
      SELECT 
        transaction_id,
        transaction_branch_id,
        branch_name,
        transaction_code,
        transaction_order_date,
        transaction_customer_id,
        transaction_customer_name,
        address_full,
        transaction_pic_name,
        transaction_total_qty,
        transaction_sub_total,
        transaction_disc_nominal,
        transaction_grand_total,
        transaction_note,
        transaction_status,
        transaction_created_at,
        (
          SELECT array_to_json(array_agg(t)) 
					FROM (
						SELECT transaction_details.*
						FROM transaction_details
						WHERE transaction_detail_transaction_id = transaction_id
					) t
        ) as details
      FROM transactions
      JOIN branches ON branch_id = transaction_branch_id
      JOIN user_addresses ON address_user_id = transaction_customer_id
      ${queryFilter}
      ORDER BY transaction_id ASC
    `

		let result: any = await Database.rawQuery(sql)
		let resultData: any = result.rowCount > 0 ? result.rows : []
    let newArr: any = []

		if (result.rowCount > 0) {
      for (let i in resultData) {
        let date = resultData[i].transaction_order_date
        let year = date.getFullYear()
        let month = String(date.getMonth() + 1).padStart(2, '0')
        let day = String(date.getDate()).padStart(2, '0')
        let transaction_order_date_format = day+"/"+month+"/"+year
        resultData[i].transaction_order_date_format = transaction_order_date_format
        newArr.push(resultData[i])
      }

			try {
				let workbook = new Excel.Workbook()
				let worksheet = workbook.addWorksheet("Sheet 1")

        worksheet.getRow(1).values = [
          "HEADER",
          "No Form",
          "Tgl Pesanan",
          "No Pelanggan",
          "No PO",
          "Alamat",
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
          "ID Salesman",
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
          { key: "", width: 15, style: { font } },
          { key: "transaction_order_date", width: 15, style: { font } },
          { key: "transaction_customer_id", width: 25, style: { font } },
          { key: "transaction_code", width: 22, style: { font } },
          { key: "address_full", width: 25, style: { font } },
          { key: "kena_ppn", width: 15, style: { font } },
          { key: "termasuk_ppn", width: 20, style: { font } },
          { key: "", width: 25, style: { font } },
          { key: "transaction_disc_nominal", width: 25, style: { font } },
          { key: "note", width: 15, style: { font } },
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
            transaction_code: item.transaction_code,
            transaction_order_date: item.transaction_order_date_format,
            transaction_customer_id: item.transaction_customer_id,
            address_full: item.address_full,
						kena_ppn: "Ya",
						termasuk_ppn: "Tidak",
						// faktur_dimuka: "Ya",
            branch_name: item.branch_name,
            transaction_disc_nominal: item.transaction_disc_nominal,
            // po_disc_percent: item.po_disc_percent
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
                { key: "pic_name", width: 25, style: { font } },
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
                product_sku: dataDetail[i].transaction_detail_product_sku,
                product_name: dataDetail[i].transaction_detail_product_name,
                product_qty: dataDetail[i].transaction_detail_qty,
                product_unit: dataDetail[i].transaction_detail_product_unit,
                product_price: dataDetail[i].transaction_detail_product_purchase_price,
                pic_name: item.transaction_pic_name,
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
            nilai_biaya: item.transaction_grand_total,
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
				let path: string = `Transaction_Accurate_${datetime}.xlsx`

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