import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class PoEdit extends BaseModel {
  @column({ isPrimary: true })
  public po_edit_id: number

  @column()
  public po_edit_po_id: number

  @column()
  public po_edit_total_product: number

  @column()
  public po_edit_total_product_qty: number

  @column()
  public po_edit_total_value: number

  @column()
  public po_edit_subtotal: number

  @column()
  public po_edit_grandtotal: number

  @column.dateTime({ autoCreate: true })
  public po_edit_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public po_edit_updated_at: DateTime
}
