import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class BranchProduct extends BaseModel {
  @column({ isPrimary: true })
  public branch_product_id: number

  @column()
  public branch_product_branch_id: number

  @column()
  public branch_product_supplier_id: number

  @column()
  public branch_product_supplier_name: string

  @column()
  public branch_product_product_id: number

  @column()
  public branch_product_sell_price: number 
  
  @column()
  public branch_product_hpp: number

  @column()
  public branch_product_status: string

  @column()
  public branch_product_stock: number

  @column()
  public branch_product_value: number

  @column()
  public branch_product_disc_percent: number

  @column()
  public branch_product_sale_price: number

  @column()
  public branch_product_disc_nominal: number

  @column.dateTime({ autoCreate: true })
  public branch_product_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public branch_product_updated_at: DateTime
}

