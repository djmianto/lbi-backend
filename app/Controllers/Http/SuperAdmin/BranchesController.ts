import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Branch from 'App/Models/Branch'
import UserAddress from 'App/Models/UserAddress'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Helper from 'App/Common/Helper'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'

export default class BranchesController {
	public async index({ request, response }: HttpContextContract) {	
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
		try {
			let sort = params.sort ? params.sort : 'branch_id'
			let dir = params.dir ? params.dir.toUpperCase() : 'ASC'
			let limit = params.limit ? parseInt(params.limit) : 10
			let page = params.page ? parseInt(params.page) : 1
			let start = (page - 1) * limit
			let search = params.search ? params.search : ''

			let from = `FROM branches`
			let queryFilter = `WHERE 1 = 1 AND branch_id != 12` //branch testing

			// if (auth.user?.$attributes.user_role !== 'super_admin' && auth.user?.$attributes.user_role !== 'cfo' && auth.user?.$attributes.user_role !== 'senior_acountant' && auth.user?.$attributes.user_role !== 'junior_acountant' && auth.user?.$attributes.user_role !== 'purchasing') {
			// 	queryFilter += ` AND user_branch_user_id = ${auth.user?.$attributes.user_id}`
			// 	from += ` FULL OUTER JOIN user_branches ON user_branches.user_branch_branch_id = branches.branch_id`
			// }

			if (params.province_id && params.province_id.length > 0 && params.province_id !== '') {
				queryFilter += `AND branch_province_id = '${params.province_id}'`
			}

			if (params.district_id && params.district_id.length > 0 && params.district_id !== '') {
				queryFilter += `AND branch_district_id = '${params.district_id}'`
			}	
			
			if (params.status && params.status.length > 0 && params.status !== '') {
				queryFilter += `AND branch_status = '${params.status}'`
			}
		
			let whereSearch = ' '
			if (search.length > 0) {
				whereSearch += `
					AND (
						branch_name ILIKE '%${search}%' OR
						branch_code ILIKE '%${search}%'
					)
				`
			}

			let sql = `
				SELECT 
          branch_id,
					branch_name,
					branch_code,
					branch_province_id,
					branch_province_name,
					branch_district_id,
					branch_district_name,
					branch_sub_district_id,
					branch_sub_district_name,
					branch_phone_number,
					branch_mobile_number,
					branch_status
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

	public async detail({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}
		let id: number = request.params().id
		try {
			let from = `FROM branches`
			let queryFilter = `WHERE branch_id = ${id}`

			let sql = `
				SELECT 
          branch_id,
          branch_name,
          branch_code,
          branch_address,
          branch_address_optional,
          branch_province_id,
          branch_province_name,
          branch_district_id,
          branch_district_name,
          branch_sub_district_id,
          branch_sub_district_name,
          branch_postal_code,
          branch_longitude,
          branch_latitude,
          branch_phone_number,
          branch_mobile_number,
          branch_open,
          branch_close,
          branch_status,
					branch_type,
          branch_max_distance_label,
          branch_max_distance,
          branch_telegram_chat_id,
          branch_created_at,
          branch_updated_at,
					COALESCE((
						SELECT COUNT(branch_product_id) as total
						FROM branch_products
						JOIN branches ON branch_id = branch_product_branch_id
						JOIN master_products ON product_id = branch_product_product_id
						WHERE branch_product_branch_id = '${id}'
						AND product_is_deleted = 0 
						LIMIT 1
					), 0) AS total_product,
					COALESCE((
						SELECT COUNT(transaction_id) as total
						FROM transactions
						JOIN branches ON branch_id = transaction_branch_id
						WHERE transaction_branch_id = '${id}'
						LIMIT 1
					), 0) AS total_transaction,
					COALESCE((
						SELECT COUNT(user_id) as total
						FROM users
						JOIN user_addresses ON address_user_id = user_id
						WHERE address_branch_id = '${id}' AND address_is_primary = '1'
						LIMIT 1
					), 0) AS total_customer
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

	public async create({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let payload: any = await request.validate({
			schema: schema.create({
				branch_name: schema.string({}),
				branch_code: schema.string({ escape: true, trim: true }, [rules.unique({ table: 'branches', column: 'branch_code' })]),
				branch_address: schema.string({}),
				branch_address_optional: schema.string.optional(),
				branch_province_id: schema.number(),
				branch_province_name: schema.string({}),
				branch_district_id: schema.number(),
				branch_district_name: schema.string({}),
				branch_sub_district_id: schema.number(),
				branch_sub_district_name: schema.string({}),
				branch_postal_code: schema.number(),
				branch_longitude: schema.string({}),
				branch_latitude: schema.string({}),
				branch_phone_number: schema.string({}),
				branch_mobile_number: schema.string({}),
				branch_open: schema.string({}),
				branch_close: schema.string({}),
				branch_max_distance_label: schema.string({}),
				branch_status: schema.enum([
					'active',
					'inactive'
				] as const),
				branch_type: schema.enum([
					'normal',
					'pps'
				] as const),
				branch_telegram_chat_id: schema.string.optional()
			}),
			reporter: CustomReporter,
			messages: {
				enum: "harus salah satu dari: {{ options.choices }}"
			}
		})

		const get_data = await Branch.findBy('branch_code', payload.branch_code)
		if (get_data) {
			output.code = 409
			output.status = 'success'
			output.message = 'kode branch telah terdaftar'
		} else {
			try {
				payload.branch_max_distance = parseInt(payload.branch_max_distance_label) * 1000
				const create = await Branch.create(payload)

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
				branch_id: schema.number(),
				branch_name: schema.string({}),
				branch_code: schema.string({}),
				branch_address: schema.string({}),
				branch_address_optional: schema.string.optional(),
				branch_province_id: schema.number(),
				branch_province_name: schema.string({}),
				branch_district_id: schema.number(),
				branch_district_name: schema.string({}),
				branch_sub_district_id: schema.number(),
				branch_sub_district_name: schema.string({}),
				branch_postal_code: schema.number(),
				branch_longitude: schema.string({}),
				branch_latitude: schema.string({}),
				branch_phone_number: schema.string({}),
				branch_mobile_number: schema.string({}),
				branch_open: schema.string({}),
				branch_close: schema.string({}),
				branch_max_distance_label: schema.string({}),
				branch_status: schema.enum([
					'active',
					'inactive'
				] as const),
				branch_type: schema.enum([
					'normal',
					'pps'
				] as const),
			}),
			reporter: CustomReporter,
			messages: {
				enum: "harus salah satu dari: {{ options.choices }}"
			}
		})

		try {
			payload.branch_max_distance = parseInt(payload.branch_max_distance_label) * 1000
			await Branch
				.query()
				.where('branch_id', payload.branch_id)
				.update(payload)

			await UserAddress
				.query()
				.where('address_branch_id', payload.branch_id)
				.update({
					'address_branch_name': payload.branch_name
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

	public async updateStatus({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}
		let payload: any = await request.validate({
			schema: schema.create({
				branch_id: schema.number(),
				branch_status: schema.enum([
					'active',
					'inactive'
				] as const)
			}),
			reporter: CustomReporter,
			messages: {
				enum: "harus salah satu dari: {{ options.choices }}"
			}
		})

		try {
			await Branch
				.query()
				.where('branch_id', payload.branch_id)
				.update(payload)

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

	public async getUserInBranch({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
		try {
			let sort = params.sort ? params.sort : 'user_id'
			let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
			let limit = params.limit ? parseInt(params.limit) : 10
			let page = params.page ? parseInt(params.page) : 1
			let start = (page - 1) * limit
			let search = params.search ? params.search : ''
			let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
			let whereSearch = ''
			let from = `FROM users
				FULL OUTER JOIN user_addresses ON user_addresses.address_user_id = users.user_id
				JOIN user_branches ON user_branches.user_branch_user_id = users.user_id
			`
			let queryFilter = `WHERE 1 = 1 `

			if (params.branch_id && params.branch_id.length > 0 && params.sub_branch_id !== '') {
				queryFilter += ` AND user_branch_branch_id = ${params.branch_id}`
			}

			if (search.length > 0) {
				whereSearch += `
					AND (
						user_first_name ILIKE '%${search}%' OR
						user_gender ILIKE '%${search}%'
					)
				`
			}

			let sql = `
				SELECT 
          user_id,
          user_email,
          user_phone_number,
          user_gender,
          user_role,
          user_first_name,
          user_last_name,
          user_full_name,
          user_profile_url,
          address_full,
          address_province_id,
          address_province_name,
          address_district_id,
          address_district_name,
          address_sub_district_id,
          address_sub_district_name,
					user_branch_id,
          user_join_date,
          user_created_at,
          user_updated_at
			  ${from}
				${queryFilter} ${whereSearch}
				ORDER BY ${sort} ${dir}
				${queryLimit}
			`
			console.log(sql)
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

}