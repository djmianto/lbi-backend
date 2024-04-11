import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class PoReceiving extends BaseModel {
  @column({ isPrimary: true })
  public po_receiving_id: number

  @column()
  public po_receiving_po_id: number

  @column()
  public po_receiving_total_received: number

  @column()
  public po_receiving_total_lack: number

  @column()
  public po_receiving_user_id: number

  @column()
  public po_receiving_note: string

  @column.dateTime({ autoCreate: true })
  public po_receiving_created_at: DateTime

}
