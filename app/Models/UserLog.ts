import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'

export default class UserLog extends BaseModel {
  @column({ isPrimary: true })
  public log_id: number

  @column()
  public log_user_id: number

  @column()
  public log_po_id: number

  @column()
  public log_transaction_id: number

  @column()
  public log_note: string

  @column()
  public log_type: string

  @column.dateTime({ autoCreate: true })
  public log_created_at: DateTime
}
