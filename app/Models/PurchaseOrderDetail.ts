import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class PoDetail extends BaseModel {
  @column({ isPrimary: true })
  public po_detail_id: number

  @column()
  public po_detail_po_id: number

  @column()
  public po_detail_branch_product_id: number

  @column()
  public po_detail_product_sku: string

  @column()
  public po_detail_product_name: string

  @column()
  public po_detail_product_purchase_price: number

  @column()
  public po_detail_disc_type: string

  @column()
  public po_detail_disc_percent: number

  @column()
  public po_detail_disc_nominal: number

  @column()
  public po_detail_nett: number

  @column()
  public po_detail_qty: number //quantity

  @column()
  public po_detail_total_product_length: number 

  @column()
  public po_detail_product_length: string //panjang inchi/meter 

  @column()
  public po_detail_product_weight: number //gramasi

  @column()
  public po_detail_product_width: number //lebar

  @column()
  public po_detail_product_unit: string //satuan(yard/meter/in)
  
  @column()
  public po_detail_product_packaging: string //belum

  @column()
  public po_detail_subtotal: number

  @column.dateTime({ autoCreate: true })
  public po_detail_created_at: DateTime
}
