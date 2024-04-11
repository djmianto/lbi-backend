import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class TransactionDetail extends BaseModel {
  @column({ isPrimary: true })
  public transaction_detail_id: number

  @column()
  public transaction_detail_transaction_id: number

  @column()
  public transaction_detail_branch_product_item_id: number

  @column()
  public transaction_detail_product_sku: string

  @column()
  public transaction_detail_product_name: string

  @column()
  public transaction_detail_price_unit: number

  @column()
  public transaction_detail_qty: number

  @column()
  public transaction_detail_discount_type: string

  @column()
  public transaction_detail_discount_amount: number

  @column()
  public transaction_detail_discount_nominal: number

  @column()
  public transaction_detail_total_price: number
  
  @column()
  public transaction_detail_price_unit_after_discount: number
  
  @column()
  public transaction_detail_product_unit: string

  @column()
  public transaction_detail_total_value: number

  @column()
  public transaction_detail_value_arr: number

  @column.dateTime({ autoCreate: true })
  public transaction_detail_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public transaction_detail_updated_at: DateTime
}
