import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class TransactionStatus extends BaseModel {
  @column({ isPrimary: true })
  public transaction_status_id: number

  @column()
  public transaction_status_transaction_id: number

  @column()
  public transaction_status_title: string

  @column()
  public transaction_status_image_url: string

  @column.dateTime({ autoCreate: true })
  public transaction_status_created_at: DateTime
}