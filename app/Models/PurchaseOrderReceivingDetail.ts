import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class PoReceivingDetail extends BaseModel {
  @column({ isPrimary: true })
  public po_receiving_detail_id: number

  @column()
  public po_receiving_detail_po_receiving_id: number

  @column()
  public po_receiving_detail_branch_product_id: number

  @column()
  public po_receiving_detail_qty: number

  @column()
  public po_receiving_detail_total_value: number

  @column()
  public po_receiving_detail_qty_lack: number

  @column()
  public po_receiving_detail_total_value_lack: number

  @column()
  public po_receiving_detail_unit: string

  @column.dateTime({ autoCreate: true })
  public po_receiving_detail_created_at: DateTime

}
