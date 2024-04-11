import Database from '@ioc:Adonis/Lucid/Database'
import BranchProductItemRecord from 'App/Models/BranchProductItemRecord'
import { BaseTask } from 'adonis5-scheduler/build'
import { DateTime } from 'luxon'

export default class BackupStock extends BaseTask {
	public static get schedule() {
		return '1 59 23 * * *'
	}
	/**
	 * Set enable use .lock file for block run retry task
	 * Lock file save to `build/tmpTaskLock`
	 */
	public static get useLock() {
		return false
	}

	public async handle() {
			console.log('Running the task every day at 23:59');
			// Your task code here
			const getDataBranchProductItems = await Database
				.query()
				.from('branch_product_items')
				// console.log(getDataBranchProductItems)
			for (let i in getDataBranchProductItems) {
				await BranchProductItemRecord.create({
					branch_product_item_record_branch_product_id: getDataBranchProductItems[i].branch_product_item_branch_product_id,
					branch_product_item_record_stock: getDataBranchProductItems[i].branch_product_item_stock,
					branch_product_item_record_value: getDataBranchProductItems[i].branch_product_item_value,
					branch_product_item_record_backup_date: DateTime.now().setZone('Asia/Jakarta').toFormat('yyyy-MM-dd')
				})
			}
			console.log(`selesai backup stock = ${DateTime.now().setZone('Asia/Jakarta').toFormat('yyyy-MM-dd')}`)
		return true
	}
}
