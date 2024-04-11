import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class TransactionPayment extends BaseModel {
  @column({ isPrimary: true })
  public transaction_payment_id: number

  @column()
  public transaction_payment_transaction_id: number

  @column()
  public transaction_payment_method: string

  @column()
  public transaction_payment_amount: number

  @column()
  public transaction_payment_status: string

  @column()
  public transaction_payment_image: string

  @column.dateTime()
  public transaction_payment_datetime: DateTime
}

