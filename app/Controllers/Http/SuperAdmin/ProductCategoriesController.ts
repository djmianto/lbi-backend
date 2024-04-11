import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import productCategories from 'App/Models/ProductCategory'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Helper from 'App/Common/Helper'
import Database from '@ioc:Adonis/Lucid/Database'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import MasterProductCategory from 'App/Models/MasterProductCategory'

export default class ProductCategoriesController {
  public async create({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let body: any = request.all()
    let payload: any = {}

    try {
      let schemaList: any = {
        category_parent_id: schema.number.optional(),
        category_name: schema.string({ trim: true }, [rules.unique({ table: 'product_categories', column: 'category_name' })]),
        category_desc: schema.string.optional({ trim: true }),
        category_image: schema.string.optional(),
        category_banner_image: schema.string.optional(),
        category_status: schema.enum(['active', 'inactive'] as const)
      }

      if (body.category_parent_id > 0) {
        schemaList = {
          ...schemaList,
          category_parent_id: schema.number([rules.exists({ table: 'product_categories', column: 'category_id' })])
        }
      }

      payload = await request.validate({
        schema: schema.create(schemaList),
        reporter: CustomReporter,
        messages: {
          enum: "harus salah satu dari: {{ options.choices }}"
        }
      })
    } catch (error) {
      return response.status(200).json(error.messages)
    }

    try {
      let create = await productCategories.create(payload)

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil tambah data',
        result: {
          data: Helper.sanitizationResponse(create)
        }
      }
    } catch (error) {
      output.message = error.message
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

    let body: any = request.all()
    let payload: any = {}

    try {
      let schemaList: any = {
        category_id: schema.number([rules.exists({ table: 'product_categories', column: 'category_id' })]),
        category_parent_id: schema.number.optional(),
        category_name: schema.string({ trim: true }, [rules.unique({ table: 'product_categories', column: 'category_name', whereNot: { category_id: body.category_id } })]),
        category_desc: schema.string.optional({ trim: true }),
        category_image: schema.string.optional(),
        category_banner_image: schema.string.optional(),
        category_status: schema.enum(['active', 'inactive'] as const)
      }

      if (body.category_parent_id > 0) {
        schemaList = {
          ...schemaList,
          category_parent_id: schema.number([rules.exists({ table: 'product_categories', column: 'category_id' })])
        }
      }

      payload = await request.validate({
        schema: schema.create(schemaList),
        reporter: CustomReporter,
        messages: {
          enum: "harus salah satu dari: {{ options.choices }}"
        }
      })
    } catch (error) {
      return response.status(200).json(error.messages)
    }

    try {
      await productCategories
        .query()
        .where('category_id', body.category_id)
        .update(payload)

      output = {
        code: 200,
        status: 'success',
        message: 'Berhasil ubah data',
        result: {
          data: Helper.sanitizationResponse(payload)
        }
      }
    } catch (error) {
      output.message = error.message
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

    let body: any = request.all()
    let payload: any = {}

    try {
      payload = await request.validate({
        schema: schema.create({
          category_id: schema.number([rules.exists({ table: 'product_categories', column: 'category_id' })]),
          category_status: schema.enum(['active', 'inactive'] as const)
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
      await productCategories
        .query()
        .where('category_id', body.category_id)
        .update(payload)

      output = {
        code: 200,
        status: 'success',
        message: 'Berhasil ubah data',
        result: {
          data: Helper.sanitizationResponse(payload)
        }
      }
    } catch (error) {
      output.message = error.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async remove({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let payload: any = await request.validate({
      schema: schema.create({
        category_id: schema.number([rules.exists({ table: 'product_categories', column: 'category_id' })])
      }),
      reporter: CustomReporter
    })

    try {
      await productCategories
        .query()
        .where('category_id', payload.category_id)
        .delete()

      await MasterProductCategory
        .query()
        .where('product_category_category_id', payload.category_id)
        .delete()

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

  public async index({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let params = request.all()

    try {
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let indent = params.indent === "space" ? "  " : "— "
      let search = params.search ? params.search : ''
      let queryFilter = 'WHERE 1 = 1 '
      let selectCategoryName = `concat(repeat('${indent}', level), category_name) as category_name`

      if (params.category_status && params.category_status.length > 0) {
        queryFilter += `AND category_status = '${params.category_status}'`
      }

      let whereSearch = ''
      if (search.length > 0) {
        selectCategoryName = 'category_name'
        whereSearch += `
				AND (
					category_name ILIKE '%${search}%' OR
					category_desc ILIKE '%${search}%'
				) `
      }

      let querySelect: string = `
				category_id, 
				category_parent_id, 
				${selectCategoryName}, 
				category_desc, 
				category_image, 
				category_status, 
				category_created_at, 
				category_updated_at
			`

      if (params.type && params.type == 'id_name') {
        querySelect = `category_id, category_parent_id, ${selectCategoryName}`
      }

      let sql = `
				WITH RECURSIVE tree (category_id, category_parent_id, category_name, category_desc, category_image, category_status, category_created_at, category_updated_at, level, rn) as 
				(
					SELECT 
					category_id, 
					category_parent_id, 
					category_name, 
					category_desc, 
					category_image, 
					category_status, 
					category_created_at, 
					category_updated_at, 0 as level,
					LPAD(cast((row_number() over (order by category_id)) as text), 5, '0') rn
					FROM product_categories
					WHERE category_parent_id = 0
				
					UNION ALL
				
					SELECT 
					sub.category_id, 
					sub.category_parent_id, 
					sub.category_name, 
					sub.category_desc, 
					sub.category_image, 
					sub.category_status, 
					sub.category_created_at, 
					sub.category_updated_at, 
					tree.level + 1,
					concat(rn,'|', LPAD(cast((row_number() over (order by tree.category_id)) as text), 5, '0'))
					FROM product_categories sub 
					INNER JOIN tree ON tree.category_id = sub.category_parent_id
				)
				
				SELECT 
				${querySelect}
				FROM tree
				${queryFilter} ${whereSearch}
				ORDER BY concat('|',rn,'|')
				${queryLimit}
			`

      let sqlTotal = `
				SELECT 1 as total 
				FROM product_categories
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

  public async listParentOnly({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let params = request.all()

    try {

      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let search = params.search ? params.search : ''
      let queryFilter = `WHERE 1 = 1 AND category_parent_id = '0'`

      if (params.category_status && params.category_status.length > 0) {
        queryFilter += `AND category_status = '${params.category_status}'`
      }

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
				AND (
					category_name ILIKE '%${search}%' OR
					category_desc ILIKE '%${search}%'
				) `
      }

      let querySelect: string = `
				category_id, 
				category_parent_id, 
				category_name, 
				category_desc, 
				category_image, 
				category_banner_image, 
				category_status, 
				category_created_at, 
				category_updated_at
			`

      if (params.type && params.type == 'id_name') {
        querySelect = `category_id, category_parent_id, category_name`
      }

      let sql = `
				SELECT 
				${querySelect}
				FROM product_categories
				${queryFilter} ${whereSearch}
				ORDER BY category_id
				${queryLimit}
			`

      let sqlTotal = `
				SELECT 1 as total 
				FROM product_categories
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

  public async listSub({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let params = request.all()

    try {

      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let indent = params.indent === "space" ? "  " : "— "
      let search = params.search ? params.search : ''
      let queryFilter = 'WHERE 1 = 1 AND category_parent_id > 0'
      let selectCategoryName = `concat(repeat('${indent}', level - 1), category_name) as category_name`

      if (params.category_status && params.category_status.length > 0) {
        queryFilter += `AND category_status = '${params.category_status}'`
      }

      let whereSearch = ''
      if (search.length > 0) {
        selectCategoryName = 'category_name'
        whereSearch += `
				AND (
					category_name ILIKE '%${search}%' OR
					category_desc ILIKE '%${search}%'
				) `
      }

      let querySelect: string = `
				category_id, 
				category_parent_id, 
				${selectCategoryName}, 
				category_desc, 
				category_image, 
				category_status, 
				category_created_at, 
				category_updated_at
			`

      if (params.type && params.type == 'id_name') {
        querySelect = `
					category_id, 
					category_parent_id,
					${selectCategoryName},
					(
						SELECT CAST(COUNT(product_category_id) as integer)
						FROM master_product_categories
						WHERE product_category_category_id = category_id
					) as category_total_product
				`
      }

      let sql = `
				WITH RECURSIVE tree (category_id, category_parent_id, category_name, category_desc, category_image, category_status, category_created_at, category_updated_at, level, rn) as 
				(
					SELECT 
					category_id, 
					category_parent_id, 
					category_name, 
					category_desc, 
					category_image, 
					category_status, 
					category_created_at, 
					category_updated_at, 0 as level,
					LPAD(cast((row_number() over (order by category_id)) as text), 5, '0') rn
					FROM product_categories
					WHERE category_parent_id = 0
				
					UNION ALL
				
					SELECT 
					sub.category_id, 
					sub.category_parent_id, 
					sub.category_name, 
					sub.category_desc, 
					sub.category_image, 
					sub.category_status, 
					sub.category_created_at, 
					sub.category_updated_at, 
					tree.level + 1,
					concat(rn,'|', LPAD(cast((row_number() over (order by tree.category_id)) as text), 5, '0'))
					FROM product_categories sub 
					INNER JOIN tree ON tree.category_id = sub.category_parent_id
				)
				
				SELECT 
				${querySelect}
				FROM tree
				${queryFilter} ${whereSearch}
				ORDER BY concat('|',rn,'|')
				${queryLimit}
			`

      let sqlTotal = `
				SELECT 1 as total 
				FROM product_categories
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

  public async tree({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let params = request.all()

    try {
      let select: any = `
				product_categories.*,
				(
					SELECT CAST(COUNT(product_category_id) as integer)
					FROM master_product_categories
					WHERE product_category_category_id = category_id
				) as total_product
			`

      let queryFilter = `WHERE 1 = 1 `

      let startParent = 0
      if (params.parent_id && params.parent_id.length > 0) {
        startParent = params.parent_id

        queryFilter += ` AND category_parent_id = '${params.parent_id}'`
      }

      if (params.type && params.type == 'id_name') {
        select = `
					category_id,
					category_parent_id,
					category_name,
					(
						SELECT CAST(COUNT(product_category_id) as integer)
						FROM master_product_categories
						WHERE product_category_category_id = category_id
					) as total_product
				`
      }

      let sql = `
				SELECT ${select}
				FROM product_categories
				${queryFilter}
				ORDER BY category_id ASC
			`

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows : []
      const sanitization = Helper.sanitizationResponse(resultData)

      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          data: Helper.arrayToTree(sanitization, Number(startParent), 'category_id', 'category_parent_id', 'category_children')
        }
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async listSubByParent({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let params = request.all()

    try {
      let sort = params.sort ? params.sort : 'category_id'
      let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit

      let from = `FROM product_categories`

      let queryFilter = `WHERE 1 = 1 `

      let show = `
				category_id,
				category_parent_id,
				category_name,
				category_desc,
				category_image,
				category_banner_image,
				category_status,
				(
					select COUNT(product_category_id)
					from master_product_categories
					where product_category_category_id = category_id
				) total_product
			`
      if (params.category_parent_id && params.category_parent_id.length > 0) {
        queryFilter += `AND category_parent_id = '${params.category_parent_id}'`
      }

      let sql = `
				SELECT ${show}
				${from}
				${queryFilter}
				ORDER BY ${sort} ${dir}
				LIMIT ${limit} OFFSET ${start}
			`
      console.log(sql)
      let sqlTotal = `
				SELECT 1 as total 
				${from}
				${queryFilter}
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

  public async createBulk({ request, response }: HttpContextContract) {
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
          category_name: schema.string({ trim: true }, [rules.unique({ table: 'product_categories', column: 'category_name' })]),
          category_desc: schema.string.optional({ trim: true }),
          category_image: schema.string.optional(),
          category_banner_image: schema.string.optional(),
          category_status: schema.enum(['active', 'inactive'] as const),
          category_children: schema.array().members(schema.object().members({
            category_name: schema.string({ trim: true }, [rules.unique({ table: 'product_categories', column: 'category_name' })]),
            category_desc: schema.string.optional({ trim: true }),
            category_image: schema.string.optional(),
            category_banner_image: schema.string.optional(),
            category_status: schema.enum(['active', 'inactive'] as const),
          }))
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
      let categoryParent: any = {
        category_parent_id: 0,
        category_name: payload.category_name,
        category_desc: payload.category_desc,
        category_image: payload.category_image,
        category_banner_image: payload.category_banner_image,
        category_status: payload.category_status
      }

      let create = await productCategories.create(categoryParent)
      let insertCategorySubBatch: any = []

      payload.category_children.forEach((subCat: any) => {
        insertCategorySubBatch.push({
          category_parent_id: create.$attributes.category_id,
          category_name: subCat.category_name,
          category_desc: subCat.category_desc,
          category_image: subCat.category_image,
          category_banner_image: subCat.category_banner_image,
          category_status: subCat.category_status
        })
      })

      if (insertCategorySubBatch.length > 0) {
        await productCategories.createMany(insertCategorySubBatch)
      }

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil tambah data',
        result: {
          data: {}
        }
      }
    } catch (error) {
      output.message = error.message
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

      let sql = `
				SELECT product_categories.*,
				(
					SELECT CAST(COUNT(category_id) as integer)
					FROM product_categories
					WHERE category_parent_id = '${id}'
				) as category_children_total,
				(
					SELECT array_to_json(array_agg(t)) 
					FROM (
						SELECT product_categories.*,
						(
							SELECT CAST(COUNT(product_category_id) as integer)
							FROM master_product_categories
							WHERE product_category_category_id = category_id
						) as category_total_product
						FROM product_categories
						WHERE category_parent_id = '${id}'
					) t
				) as category_children
				FROM product_categories
				WHERE category_id = '${id}'
			`

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows[0] : {}

      if (result.rowCount > 0) {
        if (!resultData.category_children) {
          resultData.category_children = []
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

  public async updateBulk({ request, response }: HttpContextContract) {
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
          category_id: schema.number([rules.exists({ table: 'product_categories', column: 'category_id' })]),
          category_name: schema.string({ trim: true }),
          category_desc: schema.string.optional({ trim: true }),
          category_image: schema.string.optional(),
          category_banner_image: schema.string.optional(),
          category_status: schema.enum(['active', 'inactive'] as const),
          category_children: schema.array().members(schema.object().members({
            category_id: schema.number([rules.exists({ table: 'product_categories', column: 'category_id' })]),
            category_name: schema.string({ trim: true }),
            category_desc: schema.string.optional({ trim: true }),
            category_banner_image: schema.string.optional(),
            category_status: schema.enum(['active', 'inactive'] as const),
          }))
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
      let updateParent: any = {
        category_name: payload.category_name,
        category_desc: payload.category_desc,
        category_image: payload.category_image,
        category_banner_image: payload.category_banner_image,
        category_status: payload.category_status
      }

      await productCategories
        .query()
        .where('category_id', payload.category_id)
        .update(updateParent)

      payload.category_children.forEach(async (subCat: any) => {
        let updateSub: any = {
          category_name: subCat.category_name,
          category_desc: subCat.category_desc,
          category_image: subCat.category_image,
          category_banner_image: subCat.category_banner_image,
          category_status: subCat.category_status
        }

        await productCategories
          .query()
          .where('category_id', subCat.category_id)
          .update(updateSub)
      })

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil ubah data',
        result: {
          data: {}
        }
      }
    } catch (error) {
      output.message = error.message
      output.code = 500
    }

    return response.status(200).json(output)
  }
}
