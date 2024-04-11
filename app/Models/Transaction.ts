import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Transaction extends BaseModel {
  @column({ isPrimary: true })
  public transaction_id: number

  @column()
  public transaction_code: string

  @column()
  public transaction_branch_id: number

  @column()
  public transaction_branch_name: string

  @column()
  public transaction_customer_id: number

  @column()
  public transaction_customer_name: string

  @column()
  public transaction_customer_address_order: string

  @column()
  public transaction_customer_phone_number: string

  @column()
  public transaction_pic_name: string

  @column()
  public transaction_shipping_cost: number

  @column()
  public transaction_total_qty: number

  @column()
  public transaction_total_value: number

  @column()
  public transaction_sub_total: number

  @column()
  public transaction_disc_nominal: number

  @column()
  public transaction_grand_total: number

  @column()
  public transaction_status: string

  @column()
  public transaction_note: string
  
  @column()
  public transaction_order_date: Date
  
  @column()
  public transaction_value_detail: string

  @column.dateTime({ autoCreate: true })
  public transaction_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public transaction_updated_at: DateTime
}