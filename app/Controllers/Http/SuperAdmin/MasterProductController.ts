'use strict'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import MP from 'App/Models/MasterProduct'
import Database from '@ioc:Adonis/Lucid/Database'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import Helper from 'App/Common/Helper'
import Excel from 'exceljs'
import Env from '@ioc:Adonis/Core/Env'
import Application from '@ioc:Adonis/Core/Application'
import BranchProduct from 'App/Models/BranchProduct';
// import Branch from 'App/Models/Branch';
import { DateTime } from 'luxon'
// import MasterProductCategory from 'App/Models/MasterProductCategory'

export default class MasterProductsController {
	public async create({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let payload: any = {}
		try {
			payload = await request.validate({
				schema: schema.create({
					product_sku: schema.string({ escape: true, trim: true }, [rules.unique({ table: 'master_products', column: 'product_sku' })]),
					// product_first_name: schema.string({ escape: true, trim: true }, [rules.unique({ table: 'master_products', column: 'product_name' })]),
					product_first_name: schema.string({ escape: true, trim: true }),
					product_last_name: schema.string.optional(),
					// product_default_value: schema.number(),
					product_unit: schema.string({ escape: true, trim: true }),
					product_weight: schema.number(),
					product_width: schema.number(),
					product_sell_price: schema.number(),
					product_length: schema.enum(['inchi', 'meter'] as const),
					product_status: schema.enum(['active', 'inactive'] as const),
				}),
				reporter: CustomReporter,
				messages: {
					enum: "harus salah satu dari: {{ options.choices }}"
				}
			})
		} catch (error) {
			return response.status(200).json(error.messages)
		}

		try {
			payload.product_full_name = payload.product_first_name + (payload.product_last_name ? ' ' + payload.product_last_name : '')
			let sell_price = payload.product_sell_price
			delete payload.product_sell_price
			let insertProduct: any = { ...payload }

			let create = await MP.create(insertProduct)

			if (create) {
				let sql = `
					SELECT branch_id
					FROM branches
					WHERE branch_status = 'active'
				`
				let result: any = await Database.rawQuery(sql)
				let resultData = result.rowCount > 0 ? result.rows : []

				resultData.forEach(async (item: any) => {
					let branchProduct = {
						branch_product_product_id: create.$attributes.product_id,
						branch_product_branch_id: item.branch_id,
						branch_product_status: 'active',
						branch_product_sell_price: sell_price,
					}

					await BranchProduct.create(branchProduct)
				})
			}

			output = {
				code: 201,
				status: 'success',
				message: 'Berhasil tambah data',
				result: {
					data: Helper.sanitizationResponse(create.$attributes)
				}
			}
		} catch (err) {
			output.message = err.message
			output.code = 500
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

		const productId = request.input('product_id')

		let payload: any = {}

		try {
			payload = await request.validate({
				schema: schema.create({
					product_id: schema.number([rules.exists({ table: 'master_products', column: 'product_id' })]),
					product_sku: schema.string({ escape: true, trim: true }, [rules.unique({ table: 'master_products', column: 'product_sku', whereNot: { product_id: productId } })]),
					product_first_name: schema.string({ escape: true, trim: true }),
					product_last_name: schema.string.optional(),
					// product_default_value: schema.number(),
					product_unit: schema.string({ escape: true, trim: true }),
					// product_sell_price: schema.number(),
					product_weight: schema.number(),
					product_width: schema.number(),
					product_length: schema.enum(['inchi', 'meter'] as const),
					product_status: schema.enum(['active', 'inactive'] as const),
				}),
				reporter: CustomReporter,
				messages: {
					enum: "harus salah satu dari: {{ options.choices }}"
				}
			})
		} catch (error) {
			return response.status(200).json(error.messages)
		}

		try {
			payload.product_full_name = payload.product_first_name + (payload.product_last_name ? ' ' + payload.product_last_name : '')
			// let sell_price = payload.product_sell_price
			// delete payload.product_sell_price

			let updateProduct: any = { ...payload }

			await MP
				.query()
				.where('product_id', productId)
				.update(updateProduct)
			//delete all data master product category

			// await BranchProduct
			// 	.query()
			// 	.where('branch_product_product_id', productId)
			// 	.update({
			// 		branch_product_sell_price: sell_price
			// 	})

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

	public async updateStatus({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		const productId = request.input('product_id')
		let payload: any = {}

		try {
			payload = await request.validate({
				schema: schema.create({
					product_id: schema.number([rules.exists({ table: 'master_products', column: 'product_id' })]),
					product_status: schema.enum(['active', 'inactive'] as const)
				}),
				reporter: CustomReporter,
				messages: {
					enum: "harus salah satu dari: {{ options.choices }}"
				}
			})
		} catch (error) {
			return response.status(200).json(error.messages)
		}

		try {
			await MP
				.query()
				.where('product_id', productId)
				.update(payload)

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

	public async index({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()

		try {
			let sort = params.sort ? params.sort : 'product_name'
			let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
			let limit = params.limit ? parseInt(params.limit) : 10
			let page = params.page ? parseInt(params.page) : 1
			let start = (page - 1) * limit

			let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
			let search = params.search ? params.search : ''

			let queryFilter = `WHERE 1 = 1 AND product_is_deleted = '0' `

			if (params.product_status && params.product_status.length > 0) {
				queryFilter += ` AND product_status = '${params.product_status}'`
			}


			let whereSearch = ''
			if (search.length > 0) {
				whereSearch += `
				AND (
						product_first_name ILIKE '%${search}%' OR
						product_last_name ILIKE '%${search}%' OR
						product_full_name ILIKE '%${search}%' OR
						product_sku ILIKE '%${search}%'
				) `
			}

			let sql = `
				SELECT 
					product_id,
					product_sku,
					product_first_name,
					product_last_name,
					product_full_name,
					product_desc,
					product_unit,
					product_status,
					product_weight,
					product_width,
					product_length,
					product_created_at,
					product_updated_at,
					product_is_deleted,
					branch_product_sell_price as product_sell_price
				FROM master_products
				LEFT JOIN branch_products ON branch_product_product_id = product_id
				${queryFilter}
				${whereSearch}
				ORDER BY ${sort} ${dir}
				${queryLimit}
				`

			let sqlTotal = `
				SELECT 1 as total
				FROM master_products
				${queryFilter} ${whereSearch}
				`

			if (params.branch_id && params.branch_id.length > 0) {
				sql = `
					SELECT 
						product_id,
						product_sku,
						product_name,
						product_desc,
						product_unit,
						product_status,
						product_created_at,
						product_updated_at,
						product_is_deleted,,
						branch_products.*
					FROM master_products
					JOIN branch_products ON branch_product_product_id = product_id
					${queryFilter} ${whereSearch}
					AND branch_product_branch_id = '${params.branch_id}'
					ORDER BY ${sort} ${dir}
					${queryLimit}
				`

				sqlTotal = `
					SELECT 1 as total 
					FROM master_products
					JOIN branch_products ON branch_product_product_id = product_id
					${queryFilter} ${whereSearch}
					AND branch_product_branch_id = '${params.branch_id}'
				`
			}

			let result: any = await Database.rawQuery(sql)

			let totalRow = await Database.rawQuery(sqlTotal)

			let resultData = result.rowCount > 0 ? result.rows : []
			resultData.forEach((item: any, index: number) => {
				if (item.branch_product_hpp) {
					resultData[index].branch_product_hpp = Number(item.branch_product_hpp)
				}

				if (item.branch_product_stock) {
					resultData[index].branch_product_stock = Number(item.branch_product_stock)
				}

				if (item.branch_product_disc_percent) {
					resultData[index].branch_product_disc_percent = Number(item.branch_product_disc_percent)
				}

				if (item.branch_product_sale_price) {
					resultData[index].branch_product_sale_price = Number(item.branch_product_sale_price)
				}

				if (item.branch_product_sell_price) {
					resultData[index].branch_product_sell_price = Number(item.branch_product_sell_price)
				}

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

	public async detail({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let id: number = request.params().id
		let params = request.all()

		try {

			let sql = `
				SELECT 
					product_id,
					product_sku,
					product_first_name,
					product_last_name,
					product_full_name,
					product_desc,
					product_unit,
					product_status,
					product_weight,
					product_width,
					product_length,
					product_created_at,
					product_updated_at,
					product_is_deleted,
					branch_product_sell_price as product_sell_price
				FROM master_products
				LEFT JOIN branch_products ON branch_product_product_id = product_id
				WHERE product_id = '${id}'
			`

			if (params.branch_id && params.branch_id.length > 0) {
				sql = `
					SELECT 
						product_id,
						product_sku,
						product_first_name,
						product_last_name,
						product_full_name,
						product_desc,
						product_unit,
						product_status,
						product_weight,
						product_width,
						product_length,
						product_created_at,
						product_updated_at,
						product_is_deleted,
						branch_products.*
					FROM master_products
					JOIN branch_products ON branch_product_product_id = product_id
					WHERE product_id = '${id}' AND branch_product_branch_id = '${params.branch_id}'
				`
			}

			let result: any = await Database.rawQuery(sql)
			let resultData = result.rowCount > 0 ? result.rows[0] : {}

			if (result.rowCount > 0) {
				if (resultData.branch_product_hpp) {
					resultData.branch_product_hpp = Number(resultData.branch_product_hpp)
				}
				if (resultData.branch_product_stock) {
					resultData.branch_product_stock = Number(resultData.branch_product_stock)
				}
				if (resultData.branch_product_disc_percent) {
					resultData.branch_product_disc_percent = Number(resultData.branch_product_disc_percent)
				}
				if (resultData.branch_product_sale_price) {
					resultData.branch_product_sale_price = Number(resultData.branch_product_sale_price)
				}
				if (resultData.branch_product_sell_price) {
					resultData.branch_product_sell_price = Number(resultData.branch_product_sell_price)
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

	public async delete({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let payload: any = await request.validate({
			schema: schema.create({
				product_id: schema.number([rules.exists({ table: 'master_products', column: 'product_id' })])
			}),
			reporter: CustomReporter
		})

		try {

			//hapus master product
			await MP
				.query()
				.where('product_id', payload.product_id)
				.update({
					product_is_deleted: 1,
					product_status: "inactive"
				})

			await BranchProduct
				.query()
				.where('branch_product_product_id', payload.product_id)
				.update({ branch_product_status: "inactive" })

			output = {
				code: 200,
				status: 'success',
				message: 'Berhasil hapus data',
				result: {}
			}

		} catch (err) {
			output.message = err.message
			output.code = 500
		}
		return response.status(200).json(output)
	}

	public async exportMasterProduct({ request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
		let sort = params.sort ? params.sort : 'product_id'
		let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
		// let limit = params.limit ? parseInt(params.limit) : 10
		// let page = params.page ? parseInt(params.page) : 1
		// let start = (page - 1) * limit

		// let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
		let search = params.search ? params.search : ''

		let queryFilter = `WHERE 1 = 1 AND product_is_deleted = '0' `

		if (params.product_status && params.product_status.length > 0) {
			queryFilter += ` AND product_status = '${params.product_status}'`
		}


		let whereSearch = ''
		if (search.length > 0) {
			whereSearch += `
				AND (
						product_first_name ILIKE '%${search}%' OR
						product_last_name ILIKE '%${search}%' OR
						product_full_name ILIKE '%${search}%' OR
						product_sku ILIKE '%${search}%'
				) `
		}

		let sql = `
				SELECT 
					product_id,
					product_sku,
					product_first_name,
					product_last_name,
					product_full_name,
					product_desc,
					product_unit,
					product_status,
					product_weight,
					product_width,
					product_length,
					product_created_at,
					product_updated_at,
					product_is_deleted,
					branch_product_sell_price as product_sell_price
				FROM master_products
				LEFT JOIN branch_products ON branch_product_product_id = product_id
				${queryFilter}
				${whereSearch}
				ORDER BY ${sort} ${dir}
				`

		if (params.branch_id && params.branch_id.length > 0) {
			sql = `
					SELECT 
						product_id,
						product_sku,
						product_name,
						product_desc,
						product_unit,
						product_status,
						product_created_at,
						product_updated_at,
						product_is_deleted,,
						branch_products.*
					FROM master_products
					JOIN branch_products ON branch_product_product_id = product_id
					${queryFilter} ${whereSearch}
					AND branch_product_branch_id = '${params.branch_id}'
					ORDER BY ${sort} ${dir}
				`
		}

		let result: any = await Database.rawQuery(sql)
		let resultData = result.rowCount > 0 ? result.rows : []
		resultData.forEach((item: any, index: number) => {
			if (item.branch_product_hpp) {
				resultData[index].branch_product_hpp = Number(item.branch_product_hpp)
			}

			if (item.branch_product_stock) {
				resultData[index].branch_product_stock = Number(item.branch_product_stock)
			}

			if (item.branch_product_disc_percent) {
				resultData[index].branch_product_disc_percent = Number(item.branch_product_disc_percent)
			}

			if (item.branch_product_sale_price) {
				resultData[index].branch_product_sale_price = Number(item.branch_product_sale_price)
			}

			if (item.branch_product_sell_price) {
				resultData[index].branch_product_sell_price = Number(item.branch_product_sell_price)
			}

		})

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

				worksheet.getCell('A1').value = 'Mataram Textile'
				worksheet.getCell('A2').value = 'Data Master Data'
				worksheet.getCell('A3').value = '-'
				worksheet.getCell('A4').value = '-'

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
					"Nama Produk",
					"Warna",
					"SKU",
					"Satuan",
					"Gramasi(gr)",
					"Lebar",
					"Harga Jual",
					"Status"
				];

				worksheet.columns = [
					{ header: "No", key: "no", width: 5, style: { font } },
					{ header: "Nama Produk", key: "product_full_name", width: 40, style: { font } },
					{ header: "Warna", key: "product_last_name", width: 25, style: { font } },
					{ header: "SKU", key: "product_sku", width: 30, style: { font } },
					{ header: "Satuan", key: "product_unit", width: 30, style: { font } },
					{ header: "Gramasi(gr)", key: "product_weight", width: 15, style: { font } },
					{ header: "Lebar", key: "product_width", width: 50, style: { font } },
					{ header: "Harga Jual", key: "product_sell_price", width: 20, style: { font } },
					{ header: "Status", key: "product_status", width: 20, style: { font } },
				]

				worksheet.getRow(1).fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: 'ECF0F1' },
				}

				worksheet.getRow(1).font = {
					name: 'Arial',
					size: 10,
					bold: true
				}

				let no = 1
				resultData.map(async (item: any) => {
					worksheet.addRow({
						no: no,
						product_full_name: item.product_full_name,
						product_last_name: item.product_last_name,
						product_sku: item.product_sku,
						product_unit: item.product_unit,
						product_weight: item.product_weight,
						product_width: item.product_width + ' ' + item.product_length,
						product_sell_price: item.product_sell_price,
						product_status: item.product_status,
					})
					no++
				})

				let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
				let path: string = `Data_Master_Product_${datetime}.xlsx`

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
		} else {
			output.message = "Data tidak ditemukan"
			output.status = 'error'
			output.code = 500
		}

		return response.status(200).json(output)
	}

}