import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import BranchProduct from 'App/Models/BranchProduct'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'

export default class ClonningsController {
  public async create({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let payload: any = await request.validate({
      schema: schema.create({
        branch_id_origin: schema.number(),
        branch_id_destination: schema.number()
      }),
      reporter: CustomReporter
    })

    try {
      const getBranchProductOrigin = await Database
        .query()
        .from('branch_products')
        .where('branch_product_branch_id', payload.branch_id_origin)
      if (getBranchProductOrigin.length > 0) {
        for (let i in getBranchProductOrigin) {
          let dataProductClonning: any = {
            branch_product_branch_id: payload.branch_id_destination,
            branch_product_product_id: getBranchProductOrigin[i].branch_product_product_id,
            branch_product_supplier_id: getBranchProductOrigin[i].branch_product_supplier_id ? getBranchProductOrigin[i].branch_product_supplier_id : 0,
            branch_product_supplier_name: getBranchProductOrigin[i].branch_product_supplier_name ? getBranchProductOrigin[i].branch_product_supplier_name : null,
            branch_product_stock: 0,
            branch_product_hpp: getBranchProductOrigin[i].branch_product_hpp,
            branch_product_sell_price: getBranchProductOrigin[i].branch_product_sell_price,
            branch_product_status: getBranchProductOrigin[i].branch_product_status,
            branch_product_disc_percent: getBranchProductOrigin[i].branch_product_disc_percent,
            branch_product_sale_price: getBranchProductOrigin[i].branch_product_sale_price,
          }
          await BranchProduct.create(dataProductClonning)
        }
      }

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil tambah data'
      } 
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }
}
