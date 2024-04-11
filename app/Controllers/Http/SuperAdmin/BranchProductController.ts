import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BP from 'App/Models/BranchProduct'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import Helper from 'App/Common/Helper'
import Excel from 'exceljs'
import Application from '@ioc:Adonis/Core/Application'
import Env from '@ioc:Adonis/Core/Env'
import { DateTime } from 'luxon'

export default class BranchProductsController {
	public async index({ auth, request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
		try {
			let sort = params.sort ? params.sort : 'branch_product_id'
			let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
			let limit = params.limit ? parseInt(params.limit) : 10
			let page = params.page ? parseInt(params.page) : 1
			let start = (page - 1) * limit
			let search = params.search ? params.search : ''

			let from = `FROM branch_products`
			let queryFilter = `WHERE 1 = 1 
				AND product_is_deleted = 0 
				AND branch_product_branch_id = ${auth.user?.user_branch_id}`

			// if (params.branch_id && params.branch_id.length > 0 && params.branch_id !== '') {
			// 	queryFilter += `AND branch_product_branch_id = '${params.branch_id}' `
			// }
			
			if (params.product_status && params.product_status.length > 0 && params.product_status !== '') {
				queryFilter += `AND branch_product_status = '${params.product_status}' `
			}

			let whereSearch = ' '
			if (search.length > 0) {
				whereSearch += `
					AND (
						product_sku ILIKE '%${search}%' OR
						product_full_name ILIKE '%${search}%'
					)
				`
			}

			let sql = `
				SELECT 
					branch_product_id,
					branch_product_branch_id,
					branch_product_product_id,
					branch_product_hpp,
					branch_product_sell_price,
					branch_product_status,
					product_sku,
					product_first_name,
					product_last_name,
					product_full_name,
					product_default_value,
					product_weight,
					product_width,
					product_length,
					product_unit,
					(
						SELECT CAST((SUM(branch_product_item_stock)) as integer)
						FROM branch_product_items
						WHERE branch_product_item_branch_product_id = branch_product_id
					) as total_stock
				${from}
				JOIN master_products ON product_id = branch_product_product_id
				${queryFilter} ${whereSearch}
				ORDER BY ${sort} ${dir}
				LIMIT ${limit} OFFSET ${start}
			`

			let sqlTotal = `
				SELECT 1 as total
				${from}
				JOIN master_products ON product_id = branch_product_product_id
				${queryFilter} ${whereSearch}
			`

			let result: any = await Database.rawQuery(sql)
			let totalRow = await Database.rawQuery(sqlTotal)
			let resultData = result.rowCount > 0 ? result.rows : []

			if(result.rowCount > 0){
				for(let i in resultData){
					resultData[i].total_stock = resultData[i].total_stock ? resultData[i].total_stock : 0
					resultData[i].branch_product_sell_price = resultData[i].branch_product_sell_price ? Number(resultData[i].branch_product_sell_price) : 0
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

	public async listIndex({ auth, request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
		if (!params.backup_date) {
			output.code = 404
			output.status = 'not found'
			output.message = 'Data Tidak Ditemukan'
		} else {
			try {
				let sort = params.sort ? params.sort : 'branch_product_id'
				let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
				let limit = params.limit ? parseInt(params.limit) : 10
				let page = params.page ? parseInt(params.page) : 1
				let start = (page - 1) * limit
				let search = params.search ? params.search : ''
	
				let from = `FROM branch_products`
				let queryFilter = `WHERE 1 = 1 
					AND product_is_deleted = 0 
					AND branch_product_branch_id = ${auth.user?.user_branch_id} `
	
				// if (params.branch_id && params.branch_id.length > 0 && params.branch_id !== '') {
				// 	queryFilter += `AND branch_product_branch_id = '${params.branch_id}' `
				// }
	
				if (params.product_status && params.product_status.length > 0 && params.product_status !== '') {
					queryFilter += `AND branch_product_status = '${params.product_status}' `
				}
	
				let whereSearch = ' '
				if (search.length > 0) {
					whereSearch += `
						AND (
							product_sku ILIKE '%${search}%' OR
							product_full_name ILIKE '%${search}%'
						)
					`
				}
	
				let sql = `
					SELECT 
						branch_product_id,
						branch_product_branch_id,
						branch_product_product_id,
						branch_product_hpp,
						branch_product_sell_price,
						branch_product_status,
						product_sku,
						product_first_name,
						product_last_name,
						product_full_name,
						product_default_value,
						product_weight,
						product_width,
						product_length,
						product_unit,
						(
							SELECT CAST((SUM(branch_product_item_record_stock)) as integer)
							FROM branch_product_item_records
							WHERE branch_product_item_record_branch_product_id = branch_product_id
							AND branch_product_item_record_backup_date = '${params.backup_date}'
						) as total_stock
					${from}
					JOIN master_products ON product_id = branch_product_product_id
					${queryFilter} ${whereSearch}
					ORDER BY ${sort} ${dir}
					LIMIT ${limit} OFFSET ${start}
				`
	
				let sqlTotal = `
					SELECT 1 as total
					${from}
					JOIN master_products ON product_id = branch_product_product_id
					${queryFilter} ${whereSearch}
				`
	
				let result: any = await Database.rawQuery(sql)
				let totalRow = await Database.rawQuery(sqlTotal)
				let resultData = result.rowCount > 0 ? result.rows : []
	
				if (result.rowCount > 0) {
					for (let i in resultData) {
						resultData[i].total_stock = resultData[i].total_stock ? resultData[i].total_stock : 0
						resultData[i].branch_product_sell_price = resultData[i].branch_product_sell_price ? Number(resultData[i].branch_product_sell_price) : 0
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
		}

		return response.status(200).json(output)
	}

	public async getItem({ auth, request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
		try {
			let sort = params.sort ? params.sort : 'branch_product_item_id'
			let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
			let limit = params.limit ? parseInt(params.limit) : 10
			let page = params.page ? parseInt(params.page) : 1
			let start = (page - 1) * limit
			let search = params.search ? params.search : ''

			let from = `FROM branch_product_items`
			let queryFilter = `WHERE 1 = 1 
				AND product_is_deleted = 0 
				AND branch_product_branch_id = ${auth.user?.user_branch_id} `

			// if (params.branch_id && params.branch_id.length > 0 && params.branch_id !== '') {
			// 	queryFilter += `AND branch_product_branch_id = '${params.branch_id}' `
			// }

			if (params.category_id && params.category_id.length > 0 && params.category_id !== '') {
				queryFilter += `AND product_category_category_id = '${params.category_id}' `
			}
			
			if (params.product_status && params.product_status.length > 0 && params.product_status !== '') {
				queryFilter += `AND branch_product_status = '${params.product_status}' `
			}

			let whereSearch = ' '
			if (search.length > 0) {
				whereSearch += `
					AND (
						product_sku ILIKE '%${search}%' OR
						product_name ILIKE '%${search}%'
					)
				`
			}

			let sql = `
				SELECT 
					branch_product_item_id,
					branch_product_item_branch_product_id,
					branch_product_item_stock,
					branch_product_item_value,
					branch_product_id,
					branch_product_branch_id,
					branch_product_product_id,
					branch_product_hpp,
					branch_product_sell_price,
					branch_product_status,
					product_sku,
					product_first_name,
					product_last_name,
					product_full_name,
					product_default_value,
					product_unit,
					product_weight,
					product_width,
					product_length
				${from}
				LEFT JOIN branch_products ON branch_product_item_branch_product_id = branch_product_id
				LEFT JOIN master_products ON product_id = branch_product_product_id
				${queryFilter} ${whereSearch}
				ORDER BY ${sort} ${dir}
				LIMIT ${limit} OFFSET ${start}
			`

			let sqlTotal = `
				SELECT 1 as total
				${from}
				LEFT JOIN branch_products ON branch_product_item_branch_product_id = branch_product_id
				LEFT JOIN master_products ON product_id = branch_product_product_id
				${queryFilter} ${whereSearch}
			`

			let result: any = await Database.rawQuery(sql)
			let totalRow = await Database.rawQuery(sqlTotal)
			let resultData = result.rowCount > 0 ? result.rows : []

			if(result.rowCount > 0){
				for(let i in resultData){
					resultData[i].branch_product_sell_price = resultData[i].branch_product_sell_price ? Number(resultData[i].branch_product_sell_price) : 0
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

	public async getItemBackupStock({ auth, request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
		if (!params.backup_date || !params.branch_id) {
			output.code = 404
			output.status = 'not found'
			output.message = 'Data Tidak Ditemukan'
		} else {
			try {
				let sort = params.sort ? params.sort : 'branch_product_item_record_id'
				let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
				let limit = params.limit ? parseInt(params.limit) : 10
				let page = params.page ? parseInt(params.page) : 1
				let start = (page - 1) * limit
				let search = params.search ? params.search : ''
	
				let from = `FROM branch_product_item_records`
				let queryFilter = `WHERE 1 = 1 
					AND product_is_deleted = 0 
					AND branch_product_item_record_backup_date = '${params.backup_date}'
					AND branch_product_branch_id = ${auth.user?.user_branch_id} `
	
				// if (params.branch_id && params.branch_id.length > 0 && params.branch_id !== '') {
				// 	queryFilter += `AND branch_product_branch_id = '${params.branch_id}' `
				// }
	
				if (params.category_id && params.category_id.length > 0 && params.category_id !== '') {
					queryFilter += `AND product_category_category_id = '${params.category_id}' `
				}
	
				if (params.product_status && params.product_status.length > 0 && params.product_status !== '') {
					queryFilter += `AND branch_product_status = '${params.product_status}' `
				}
	
				let whereSearch = ' '
				if (search.length > 0) {
					whereSearch += `
						AND (
							product_sku ILIKE '%${search}%' OR
							product_name ILIKE '%${search}%'
						)
					`
				}
	
				let sql = `
					SELECT 
						branch_product_item_record_id as branch_product_item_id,
						branch_product_item_record_branch_product_id as branch_product_item_branch_product_id,
						branch_product_item_record_stock as branch_product_item_stock,
						branch_product_item_record_value as branch_product_item_value,
						branch_product_item_record_backup_date as branch_product_item_backup_date,
						branch_product_id,
						branch_product_branch_id,
						branch_product_product_id,
						branch_product_hpp,
						branch_product_sell_price,
						branch_product_status,
						product_sku,
						product_first_name,
						product_last_name,
						product_full_name,
						product_default_value,
						product_unit
					${from}
					LEFT JOIN branch_products ON branch_product_item_record_branch_product_id = branch_product_id
					LEFT JOIN master_products ON product_id = branch_product_product_id
					${queryFilter} ${whereSearch}
					ORDER BY ${sort} ${dir}
					LIMIT ${limit} OFFSET ${start}
				`
	
				let sqlTotal = `
					SELECT 1 as total
					${from}
					LEFT JOIN branch_products ON branch_product_item_record_branch_product_id = branch_product_id
					LEFT JOIN master_products ON product_id = branch_product_product_id
					${queryFilter} ${whereSearch}
				`
	
				let result: any = await Database.rawQuery(sql)
				let totalRow = await Database.rawQuery(sqlTotal)
				let resultData = result.rowCount > 0 ? result.rows : []
	
				if (result.rowCount > 0) {
					for (let i in resultData) {
						resultData[i].branch_product_sell_price = resultData[i].branch_product_sell_price ? Number(resultData[i].branch_product_sell_price) : 0
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
					branch_product_id,
					branch_product_branch_id,
					branch_product_product_id,
					branch_product_hpp,
					branch_product_sell_price,
					branch_product_status,
					product_sku,
					product_first_name,
					product_last_name,
					product_full_name,
					product_desc,
					product_weight,
					product_width,
					product_length
				FROM branch_products
				JOIN master_products ON product_id = branch_product_product_id
				WHERE branch_product_id = ${id}
				AND branch_product_branch_id = ${auth.user?.user_branch_id}
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
	
  public async create({ auth, request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		// let branchId = 0

		// if (auth.user?.user_role !== 'super_admin' && auth.user?.user_role !== 'bod') {
		// 	const getBranchId = await Database
		// 		.query()
		// 		.from('user_branches')
		// 		.where('user_branch_user_id', auth.user?.user_id)
		// 		.first()
		// 	if (getBranchId) {
		// 		branchId = getBranchId.user_branch_branch_id
		// 	}
		// }

		let payload: any
		
		if (auth.user?.user_role !== 'super_admin' && auth.user?.user_role !== 'bod') {
			payload = await request.validate({
				schema: schema.create({
					branch_product_product_id: schema.number(),
					branch_product_supplier_id: schema.number.optional(),
					branch_product_supplier_name: schema.string.optional(),
					branch_product_status: schema.enum(['active', 'inactive'] as const),
					branch_product_sell_price: schema.number.optional(),
				}),
				reporter: CustomReporter,
				messages: {
					enum: "harus salah satu dari: {{ options.choices }}"
				}
			})
			payload.branch_product_branch_id = auth.user?.user_branch_id
		} else {
			payload = await request.validate({
				schema: schema.create({
					branch_product_product_id: schema.number(),
					branch_product_branch_id: schema.number([rules.exists({ table: 'branches', column: 'branch_id' })]),
					branch_product_supplier_id: schema.number.optional(),
					branch_product_supplier_name: schema.string.optional(),
					branch_product_status: schema.enum(['active', 'inactive'] as const),
					branch_product_sell_price: schema.number.optional(),
				}),
				reporter: CustomReporter,
				messages: {
					enum: "harus salah satu dari: {{ options.choices }}"
				}
			})
		}

		const get_data = await Database
			.query()
			.select('branch_product_id')
			.from('branch_products')
			.where('branch_product_product_id', payload.branch_product_product_id)
			.where('branch_product_branch_id', payload.branch_product_branch_id)
			.first()

		if (get_data) {
			output.code = 409
			output.message = 'product telah terdaftar'
		} else {
			try {
				const create = await BP.create(payload)

				output = {
					code: 201,
					status: 'success',
					message: 'Berhasil tambah data',
					result: create
				}
			} catch (err) {
				output.message = err.message
				output.code = 500
			}
		}
		return response.status(200).json(output)
	}

	public async update({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}
		let payload: any = await request.validate({
			schema: schema.create({
				branch_product_id: schema.number(),
				branch_product_product_id: schema.number(),
				// branch_product_branch_id: schema.number(),
				branch_product_supplier_id: schema.number.optional(),
				branch_product_supplier_name: schema.string.optional(),
				branch_product_status: schema.enum(['active', 'inactive'] as const),
				branch_product_sell_price: schema.number.optional(),
			}),
			reporter: CustomReporter,
			messages: {
				enum: "harus salah satu dari: {{ options.choices }}"
			}
		})

		try {
			await BP
				.query()
				.where('branch_product_id', payload.branch_product_id)
				.update(payload)

			output = {
				code: 201,
				status: 'success',
				message: 'Berhasil ubah data',
				result: Helper.sanitizationResponse(payload)
			}
		} catch (err) {
			output.message = err.message
			output.code = 500
		}
		return response.status(200).json(output)
	}

	public async updateStatus({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let payload: any = await request.validate({
			schema: schema.create({
				branch_product_id: schema.number(),
				branch_product_status: schema.enum(['active', 'inactive'] as const)
			}),
			reporter: CustomReporter,
			messages: {
				enum: "harus salah satu dari: {{ options.choices }}"
			}
		})

		try {
			await BP
				.query()
				.where('branch_product_id', payload.branch_product_id)
				.update(payload)

			output = {
				code: 201,
				status: 'success',
				message: 'Berhasil ubah data',
				result: Helper.sanitizationResponse(payload)
			}
		} catch (err) {
			output.message = err.message
			output.code = 500
		}
		return response.status(200).json(output)
	}

	public async delete({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}
		let payload: any = await request.validate({
			schema: schema.create({
				branch_product_id: schema.number()
			}),
			reporter: CustomReporter
		})

		try {
			await BP.query().where('branch_product_id', payload.branch_product_id).delete()

			output = {
				code: 201,
				status: 'success',
				message: 'Berhasil hapus data'
			}
		} catch (err) {
			output.message = err.message
			output.code = 500
		}

		return response.status(200).json(output)
	}

	public async getItemById({ auth, request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
		try {

			let sort = params.sort ? params.sort : 'branch_product_id'
			let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
			let limit = params.limit ? parseInt(params.limit) : 10
			let page = params.page ? parseInt(params.page) : 1
			let start = (page - 1) * limit

			let from = `FROM branch_products`
			let queryFilter = `WHERE 1 = 1 
				AND product_is_deleted = 0 
				AND branch_product_branch_id = ${auth.user?.user_branch_id}`

			if(params.arr_branch_product_id && params.arr_branch_product_id.length > 0 && params.arr_branch_product_id !== ''){
				queryFilter += `AND branch_product_id IN (${params.arr_branch_product_id}) `
			}else{
				queryFilter += `AND branch_product_id = 0 `
			}

			let sql = `
				SELECT 
					branch_product_id,
					branch_product_branch_id,
					branch_product_product_id,
					branch_product_hpp,
					branch_product_sell_price,
					branch_product_status,
					branch_product_stock,
					product_sku,
					product_first_name,
					product_last_name,
					product_full_name,
					product_weight,
					product_width,
					product_length,
					product_unit,
					(
						SELECT array_to_json(array_agg(t)) 
						FROM (
							SELECT branch_product_item_id, 
								branch_product_item_stock,
								branch_product_item_value
							FROM branch_product_items
							WHERE branch_product_item_branch_product_id = branch_product_id
							ORDER BY branch_product_item_created_at ASC
						) t
					) as product_items
				${from}
				JOIN master_products ON product_id = branch_product_product_id
				${queryFilter}
				ORDER BY ${sort} ${dir}
				LIMIT ${limit} OFFSET ${start}
			`

			let sqlTotal = `
				SELECT 1 as total
				${from}
				JOIN master_products ON product_id = branch_product_product_id
				${queryFilter}
			`

			let result: any = await Database.rawQuery(sql)
			let totalRow = await Database.rawQuery(sqlTotal)
			let resultData = result.rowCount > 0 ? result.rows : []

			if(result.rowCount > 0){
				for(let i in resultData){
					resultData[i].product_items = resultData[i].product_items ? resultData[i].product_items : []
					if(resultData[i].product_items.length > 0){
						let dataItem = resultData[i].product_items
						const duplicatedItems : any= [];

						dataItem.forEach((item:any) => {
							const stock = item.branch_product_item_stock;
					
							for (let i = 0; i < stock; i++) {
								// Clone the item and add it to the duplicated items array
								const duplicatedItem = { ...item };
								duplicatedItems.push(duplicatedItem);
							}
						})
					
					// Update the "product_items" array with the duplicated items
					resultData[i].product_items = duplicatedItems;

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

	public async export({ auth, request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}
		let params = request.all()
		let search = params.search ? params.search : ''
		let branch_name = 'All'
		let queryFilter = `WHERE 1 = 1 
			AND product_is_deleted = 0
			AND branch_product_branch_id = ${auth.user?.user_branch_id} `

		if (params.branch_id) {
			queryFilter += `AND branch_product_branch_id = ${params.branch_id} `
			const getBranch = await Database
        .query()
        .select('branch_name')
        .from('branches')
        .where('branch_id', params.branch_id)
      if(getBranch){
        branch_name = getBranch[0].branch_name
      }
		}

		if (params.category_id && params.category_id.length > 0 && params.category_id !== '') {
			queryFilter += `AND product_category_category_id = '${params.category_id}' `
		}
		
		if (params.product_status && params.product_status.length > 0 && params.product_status !== '') {
			queryFilter += `AND branch_product_status = '${params.product_status}' `
		}

		let whereSearch = ' '
		if (search.length > 0) {
			whereSearch += `
				AND (
					product_sku ILIKE '%${search}%' OR
					product_name ILIKE '%${search}%'
				)
			`
		}

		let sql: string = `
			SELECT 
				branch_product_id,
				branch_product_branch_id,
				branch_product_product_id,
				branch_product_hpp,
				branch_product_sell_price,
				branch_product_status,
				branch_product_stock,
				product_sku,
				product_name,
				product_desc,
				product_photo,
				product_default_value,
				product_unit,
				category_id,
				category_name,
				branch_id,
				branch_name
			FROM branch_products
			JOIN master_products ON product_id = branch_product_product_id
			JOIN master_product_categories ON product_category_product_id = branch_product_product_id
			JOIN product_categories ON product_category_category_id = category_id
			JOIN branches ON branch_id = branch_product_branch_id
			${queryFilter} ${whereSearch}
			ORDER BY branch_product_id ASC
		`
		let result: any = await Database.rawQuery(sql)
		let resultData: any = result.rowCount > 0 ? Helper.sanitizationResponse(result.rows) : []
		if (result.rowCount > 0) {
			try {
				let workbook = new Excel.Workbook()
				let worksheet = workbook.addWorksheet("Sheet 1")
				let font = { name: 'Arial', size: 10 }

				worksheet.mergeCells('A1', 'O1')
        worksheet.mergeCells('A2', 'O2')
        worksheet.mergeCells('A3', 'O3')
        worksheet.mergeCells('A4', 'O4')
        worksheet.mergeCells('A5', 'O5')
  
        worksheet.getCell('A1').value = 'PT. Bakool Nusantara'
        worksheet.getCell('A2').value = 'Data Branch Product'
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
        }
        worksheet.getCell('A2').font = {
          name: 'Arial',
          size: 12,
          bold: true
        }
        worksheet.getCell('A5').font = {
          name: 'Arial',
          size: 10,
          bold: true
        }
  
        worksheet.getRow(6).values = [
          "No", 
          "Product Name", 
          "SKU", 
          "Stock", 
          "Stock Type", 
          "Last HPP Price (Rp)", 
          "B2B Price (Rp)", 
          "B2C Price (Rp)", 
          "Discount Percent (%)", 
          "Sale Price (Rp)", 
          "Packaging", 
          "Selling Unit", 
          "Product Category", 
          "Product Status", 
        ]

				worksheet.columns = [
					{ header: "No", key: "no", width: 5, style: { font } },
					{ header: "Product Name", key: "product_name", width: 60, style: { font } },
					{ header: "SKU", key: "product_sku", width: 15, style: { font } },
					{ header: "Stock", key: "branch_product_stock", width: 15, style: { font } },
					{ header: "Stock Type", key: "product_stock_type", width: 20, style: { font } },
					{ header: "Last HPP Price (Rp)", key: "branch_product_hpp", width: 15, style: { font } },
					{ header: "Discount Percent (%)", key: "branch_product_disc_percent", width: 15, style: { font } },
					{ header: "Sale Price (Rp)", key: "branch_product_sale_price", width: 15, style: { font } },
					{ header: "Packaging", key: "product_unit", width: 20, style: { font } },
					{ header: "Selling Unit", key: "branch_product_selling_unit", width: 15, style: { font } },
					{ header: "Product Category", key: "category_name", width: 20, style: { font } },
					{ header: "Product Status", key: "branch_product_status", width: 20, style: { font } },
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
				resultData.map(async (item: any) => {
					worksheet.addRow({
						no: no,
						product_name: item.product_name,
						product_sku: item.product_sku,
						branch_product_stock: item.branch_product_stock,
						product_stock_type: item.product_stock_type,
						branch_product_hpp: item.branch_product_hpp,
						branch_product_disc_percent: item.branch_product_disc_percent,
						branch_product_sale_price: item.branch_product_sale_price,
						product_unit: item.product_unit,
						branch_product_selling_unit: item.branch_product_selling_unit,
						category_name: item.branch_category_name,
						branch_product_status: item.branch_product_status,
					})
					no++
				})

				let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
				let path: string = `Product_Branch_${branch_name}_${datetime}.xlsx`
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

			} catch (err) {
				output.message = err.message
				output.code = 500
			}
		}

		return response.status(200).json(output)
	}

	public async exportAccurate({ auth, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

    let queryFilter = `WHERE 1 = 1 
			AND product_is_deleted = 0 
			AND branch_product_branch_id = ${auth.user?.user_branch_id}`

    let sql = `
      SELECT 
				branch_product_id,
				branch_product_branch_id,
				branch_name,
				branch_product_product_id,
				branch_product_hpp,
				branch_product_sell_price,
				branch_product_status,
				DATE(branch_product_created_at) as branch_product_created_at,
				product_sku,
				product_first_name,
				product_last_name,
				product_full_name,
				product_default_value,
				product_weight,
				product_width,
				product_length,
				product_unit,
				(
					SELECT CAST((SUM(branch_product_item_stock)) as integer)
					FROM branch_product_items
					WHERE branch_product_item_branch_product_id = branch_product_id
				) as total_stock
      FROM branch_products
			JOIN master_products ON product_id = branch_product_product_id
			JOIN branches ON branch_id = branch_product_branch_id
      ${queryFilter}
      ORDER BY branch_product_id ASC
    `

		let result: any = await Database.rawQuery(sql)
		let resultData: any = result.rowCount > 0 ? result.rows : []
		let newArr: any = []

		console.log(resultData)

		if (result.rowCount > 0) {
			for (let i in resultData) {
				let newDate = await Helper.formatDateNew(resultData[i].branch_product_created_at)
        resultData[i].branch_product_created_at_format = newDate
				newArr.push(resultData[i])
      }

			try {
				let workbook = new Excel.Workbook()
				let worksheet = workbook.addWorksheet("Sheet 1")
				let font = { name: 'Arial', size: 13 }

				worksheet.columns = [
					{ header: "Item Category", key: "item_category", width: 15, style: { font } },
					{ header: "Item Code", key: "product_sku", width: 15, style: { font } },
					{ header: "Item Name", key: "product_full_name", width: 30, style: { font } },
					{ header: "Item Type", key: "item_type", width: 15, style: { font } },
					{ header: "Inventory Type", key: "", width: 15, style: { font } },
					{ header: "UPC/Barcode", key: "", width: 15, style: { font } },
					{ header: "Unit", key: "product_unit", width: 20, style: { font } },
					{ header: "Unit #2", key: "", width: 20, style: { font } },
					{ header: "Unit 2 Ratio", key: "", width: 15, style: { font } },
					{ header: "Unit #3", key: "", width: 15, style: { font } },
					{ header: "Unit 3 Ratio", key: "", width: 15, style: { font } },
					{ header: "Unit #4", key: "", width: 15, style: { font } },
					{ header: "Unit 4 Ratio", key: "", width: 15, style: { font } },
					{ header: "Unit #5", key: "", width: 15, style: { font } },
					{ header: "Unit 5 Ratio", key: "", width: 15, style: { font } },
					{ header: "Default Sales Price #1", key: "branch_product_sell_price", width: 25, style: { font } },
					{ header: "Default Sales Price #2", key: "", width: 25, style: { font } },
					{ header: "Default Sales Price #3", key: "", width: 25, style: { font } },
					{ header: "Default Sales Price #4", key: "", width: 25, style: { font } },
					{ header: "Default Sales Price #5", key: "", width: 25, style: { font } },
					{ header: "Purchase Unit", key: "", width: 20, style: { font } },
					{ header: "Control Quantity", key: "control_qty", width: 20, style: { font } },
					{ header: "Purchase Price", key: "branch_product_hpp", width: 25, style: { font } },
					{ header: "Minimum Qty", key: "", width: 15, style: { font } },
					{ header: "Minimum Stock Reminder", key: "", width: 15, style: { font } },
					{ header: "Default Discount (%)", key: "", width: 15, style: { font } },
					{ header: "Preferred Supplier", key: "", width: 15, style: { font } },
					{ header: "VAT", key: "", width: 15, style: { font } },
					{ header: "Luxury Goods Addition Tax", key: "", width: 15, style: { font } },
					{ header: "Income Tax", key: "", width: 15, style: { font } },
					{ header: "Opening Balance's Branch", key: "", width: 15, style: { font } },
					{ header: "Warehouse Opening Balance", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Quantity", key: "total_stock", width: 15, style: { font } },
					{ header: "Opening Balance unit", key: "", width: 25, style: { font } },
					{ header: "Cost value", key: "cost_value", width: 20, style: { font } },
					{ header: "As of Date", key: "branch_product_created_at_format", width: 20, style: { font } },
					{ header: "Character 1", key: "", width: 15, style: { font } },
					{ header: "Character 2", key: "", width: 15, style: { font } },
					{ header: "Character 3", key: "", width: 15, style: { font } },
					{ header: "Character 4", key: "", width: 15, style: { font } },
					{ header: "Character 5", key: "", width: 15, style: { font } },
					{ header: "Character 6", key: "", width: 15, style: { font } },
					{ header: "Character 7", key: "", width: 15, style: { font } },
					{ header: "Character 8", key: "", width: 15, style: { font } },
					{ header: "Character 9", key: "", width: 15, style: { font } },
					{ header: "Character 10", key: "", width: 15, style: { font } },
					{ header: "Numeric 1", key: "", width: 15, style: { font } },
					{ header: "Numeric 2", key: "", width: 15, style: { font } },
					{ header: "Numeric 3", key: "", width: 15, style: { font } },
					{ header: "Numeric 4", key: "", width: 15, style: { font } },
					{ header: "Numeric 5", key: "", width: 15, style: { font } },
					{ header: "Numeric 6", key: "", width: 15, style: { font } },
					{ header: "Numeric 7", key: "", width: 15, style: { font } },
					{ header: "Numeric 8", key: "", width: 15, style: { font } },
					{ header: "Numeric 9", key: "", width: 15, style: { font } },
					{ header: "Numeric 10", key: "", width: 15, style: { font } },
					{ header: "Date 1", key: "", width: 15, style: { font } },
					{ header: "Date 2", key: "", width: 15, style: { font } },
					{ header: "Inventory", key: "", width: 15, style: { font } },
					{ header: "Sales", key: "", width: 25, style: { font } },
					{ header: "Purchase Return", key: "", width: 25, style: { font } },
					{ header: "Cost of Goods Sold", key: "", width: 20, style: { font } },
					{ header: "Sales Return", key: "", width: 15, style: { font } },
					{ header: "Sales Discount", key: "", width: 15, style: { font } },
					{ header: "Goods in Transit", key: "", width: 15, style: { font } },
					{ header: "Unbilled Goods", key: "", width: 15, style: { font } },
					{ header: "Used in branch", key: "", width: 20, style: { font } },
					{ header: "Notes", key: "", width: 15, style: { font } },
					{ header: "User Serial Number", key: "serial_number", width: 20, style: { font } },
					{ header: "Serial Number type", key: "", width: 15, style: { font } },
					{ header: "Use Expiration date", key: "exp_date", width: 20, style: { font } },
					{ header: "Substituted with", key: "", width: 15, style: { font } },
					{ header: "Suspended", key: "branch_product_status", width: 25, style: { font } },
					{ header: "Wholesale Price", key: "", width: 15, style: { font } },
					{ header: "Length (cm)", key: "product_length", width: 15, style: { font } },
					{ header: "Width (cm)", key: "product_width", width: 15, style: { font } },
					{ header: "Height (cm)", key: "", width: 15, style: { font } },
					{ header: "Weight (gr)", key: "product_weight", width: 15, style: { font } },
					{ header: "Label Variant 1", key: "", width: 15, style: { font } },
					{ header: "Label Variant 2", key: "", width: 15, style: { font } },
					{ header: "Data Variant 1", key: "", width: 15, style: { font } },
					{ header: "Data Variant 2", key: "", width: 15, style: { font } },
				]

        newArr.map(async (item: any) => {
					let length = 0
					if (item.product_length == 'inchi') {
						length = item.product_width * 2.54
					} else if (item.product_length == 'meter') {
						length = item.product_width * 100
					}
					worksheet.addRow({
						item_category: '',
						item_type: 'INV',
						product_sku: item.product_sku,
						product_full_name: item.product_full_name,
            product_unit: item.product_unit,
            branch_product_hpp: item.branch_product_hpp,
            branch_product_sell_price: item.branch_product_sell_price,
            product_length: length,
            product_width: length,
            product_weight: item.product_weight,
            total_stock: item.total_stock == null ? 0 : item.total_stock,
						cost_value : item.branch_product_hpp * (item.total_stock == null ? 0 : item.total_stock),
            branch_product_created_at_format: item.branch_product_created_at_format,
            branch_name: item.branch_name,
            serial_number: 'NO',
            exp_date: 'NO',
            control_qty: 'NO',
            branch_product_status: item.branch_product_status == 'active' ? 'No' : 'Yes',
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

        let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
				let path: string = `Item_Accurate_${datetime}.xlsx`

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