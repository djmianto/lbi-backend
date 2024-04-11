import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Helper from 'App/Common/Helper'
import Database from '@ioc:Adonis/Lucid/Database'
export default class PublicsController {
  public async province({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let params = request.all()

    try {
      let sort = params.sort ? params.sort : 'provinces_id'
      let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit

      let search = params.search ? params.search : ''
      let from = `FROM provinces`
      let queryFilter = `WHERE 1 = 1`

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
					AND (
						provinces_name ILIKE '%${search}%'
					)
				`
      }

      let sql = `
				SELECT *
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

  public async district({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let params = request.all()
    let id: number = request.params().id
    try {
      let sort = params.sort ? params.sort : 'districts_id'
      let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit

      let search = params.search ? params.search : ''
      let from = `FROM districts`
      let queryFilter = `WHERE 1 = 1`

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
					AND (
						districts_name ILIKE '%${search}%'
					)
				`
      }
      if (id > 0) {
        queryFilter += `  AND districts_province_id = '${id}'`
      }

      let sql = `
				SELECT *
				${from}
				${queryFilter} ${whereSearch}
				ORDER BY ${sort} ${dir}
				LIMIT ${limit} OFFSET ${start}
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

  public async subdistrict({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let id: number = request.params().id
    let params = request.all()
    try {
      let sort = params.sort ? params.sort : 'subdistrict_id'
      let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit

      let search = params.search ? params.search : ''
      let from = `FROM subdistricts`
      let queryFilter = `WHERE 1 = 1`

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
					AND (
						subdistrict_name ILIKE '%${search}%'
					)
				`
      }
      if (id > 0) {
        queryFilter += ` AND subdistrict_district_id = '${id}'`
      }

      let sql = `
				SELECT *
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

}
