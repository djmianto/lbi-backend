import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Helper from 'App/Common/Helper'

export default class StocksController {
	public async index({ auth, request, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		let params = request.all()
		try {
			if(params.date){
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

				if (params.product_last_name && params.product_last_name.length > 0 && params.product_last_name !== '') {
					queryFilter += `AND product_last_name = '${params.product_last_name}' `
				}

				let whereSearch = ' '
				if (search.length > 0) {
					whereSearch += `
						AND (
							product_sku ILIKE '%${search}%' OR
							product_full_name ILIKE '%${search}%' OR
							product_last_name ILIKE '%${search}%' 
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
								SELECT branch_product_item_record_id as branch_product_item_id, 
									branch_product_item_record_stock as branch_product_item_stock,
									branch_product_item_record_value as branch_product_item_value
								FROM branch_product_item_records
								WHERE branch_product_item_records.branch_product_item_record_branch_product_id = branch_product_id
								AND branch_product_item_record_backup_date = '${params.date}'
								ORDER BY branch_product_item_record_created_at ASC
							) t
						) as product_items
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
			}else{
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

				if (params.product_last_name && params.product_last_name.length > 0 && params.product_last_name !== '') {
					queryFilter += `AND product_last_name = '${params.product_last_name}' `
				}

				let whereSearch = ' '
				if (search.length > 0) {
					whereSearch += `
						AND (
							product_sku ILIKE '%${search}%' OR
							product_full_name ILIKE '%${search}%' OR
							product_last_name ILIKE '%${search}%' 
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
								WHERE branch_product_items.branch_product_item_branch_product_id = branch_product_id
								ORDER BY branch_product_item_created_at ASC
							) t
						) as product_items
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
			}

		} catch (err) {
			output.message = err.message
			output.code = 500
		}

		return response.status(200).json(output)
	}
}