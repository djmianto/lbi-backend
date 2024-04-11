import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Po extends BaseModel {
  @column({ isPrimary: true })
  public po_id: number

  @column()
  public po_branch_id: number

  @column()
  public po_supplier_id: number

  @column()
  public po_supplier_name: string
  
  @column()
  public po_req_number: string
  
  @column()
  public po_proforma_number: string

  @column()
  public po_date: number

  @column()
  public po_pic_name: number

  @column()
  public po_total_product: number

  @column()
  public po_total_product_qty: number

  @column()
  public po_total_value: number

  @column()
  public po_subtotal: number

  @column()
  public po_disc_type: number

  @column()
  public po_disc_percent: number

  @column()
  public po_disc_nominal: number

  @column()
  public po_shipping_fee: number

  @column()
  public po_grandtotal: number

  @column()
  public po_payment_method: string

  @column()
  public po_payment_status: string

  @column()
  public po_status: string
  
  @column()
  public po_package_price: number

  @column()
  public po_approval_status: string

  @column()
  public po_approval_edit: string

  @column()
  public po_approval_user_id: number

  @column()
  public po_approval_user_name: string

  @column()
  public po_is_stock: number

  @column()
  public po_is_invoice: number
  
  @column()
  public po_approval_datetime: DateTime
  
  @column()
  public po_received_datetime: DateTime
  
  @column()
  public po_proforma_datetime: DateTime

  @column.dateTime({ autoCreate: true })
  public po_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public po_updated_at: DateTime
}
