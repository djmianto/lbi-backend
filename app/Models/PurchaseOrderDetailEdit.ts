import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class PoDetailEdit extends BaseModel {
  @column({ isPrimary: true })
  public po_detail_edit_id: number

  @column()
  public po_detail_edit_po_id: number

  @column()
  public po_detail_edit_po_detail_id: number

  @column()
  public po_detail_edit_branch_product_id: number

  @column()
  public po_detail_edit_product_sku: string

  @column()
  public po_detail_edit_product_name: string

  @column()
  public po_detail_edit_product_purchase_price: number

  @column()
  public po_detail_edit_qty: number //quantity

  @column()
  public po_detail_edit_total_product_length: number 

  @column()
  public po_detail_edit_product_length: string //panjang inchi/meter 

  @column()
  public po_detail_edit_product_weight: number //gramasi

  @column()
  public po_detail_edit_product_width: number //lebar

  @column()
  public po_detail_edit_product_unit: string //satuan(yard/meter/in)
  
  @column()
  public po_detail_edit_subtotal: number

  @column.dateTime({ autoCreate: true })
  public po_detail_edit_created_at: DateTime
}
