import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class BranchProductItem extends BaseModel {
  @column({ isPrimary: true })
  public branch_product_item_id: number

  @column()
  public branch_product_item_branch_product_id: number

  @column()
  public branch_product_item_stock: number

  @column()
  public branch_product_item_value: number

  @column.dateTime({ autoCreate: true })
  public branch_product_item_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public branch_product_item_updated_at: DateTime
}

