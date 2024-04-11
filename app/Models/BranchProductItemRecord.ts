import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class BranchProductItemRecord extends BaseModel {
  @column({ isPrimary: true })
  public branch_product_item_record_id: number

  @column()
  public branch_product_item_record_branch_product_id: number

  @column()
  public branch_product_item_record_stock: number

  @column()
  public branch_product_item_record_value: number

  @column()
  public branch_product_item_record_backup_date: string

  @column.dateTime({ autoCreate: true })
  public branch_product_item_record_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public branch_product_item_record_updated_at: DateTime
}
