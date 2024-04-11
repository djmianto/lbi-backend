import Route from '@ioc:Adonis/Core/Route'
/* public */

Route.group(() => {
  Route.post('login/admin', 'AuthController.loginAdmin')
  
  Route.get('province/list', 'PublicsController.province')
  Route.get('district/list/:id', 'PublicsController.district')
  Route.get('subdistrict/list/:id', 'PublicsController.subdistrict')

  Route.group(() => {
    Route.get('/download/:filename', 'FileDownloadsController.index')
  }).prefix('/files')

})

/* super admin area */
Route.group(() => {
  Route.group(() => {
    Route.get('/widget', 'SuperAdmin/DashboardsController.widgetSummary')
    Route.get('/sales/chart', 'SuperAdmin/DashboardsController.salesChart')
    Route.get('/total/sales/chart', 'SuperAdmin/DashboardsController.totalSalesChart')
    Route.get('/purchase/chart', 'SuperAdmin/DashboardsController.purchaseChart')
    Route.get('/total/purchase/chart', 'SuperAdmin/DashboardsController.totalPurchaseChart')
  }).prefix('/dashboard')

  Route.group(() => {
    Route.get('/list', 'SuperAdmin/AdminMenusController.index')
    Route.post('/create', 'SuperAdmin/AdminMenusController.create')
    Route.patch('/update', 'SuperAdmin/AdminMenusController.update')
    Route.delete('/remove', 'SuperAdmin/AdminMenusController.remove')
    Route.get('/detail/:id', 'SuperAdmin/AdminMenusController.detail')
  }).prefix('/menu')

  Route.group(() => {
    Route.get('/list/year', 'SuperAdmin/ReportSalesController.indexYear')
    Route.get('/list/month', 'SuperAdmin/ReportSalesController.indexMonth')
    Route.get('/list/daily', 'SuperAdmin/ReportSalesController.indexDaily')
    Route.get('/widget', 'SuperAdmin/ReportSalesController.widget')
    Route.get('/chart/year', 'SuperAdmin/ReportSalesController.salesChartYear')
    Route.get('/chart/month', 'SuperAdmin/ReportSalesController.salesChartMonth')
    Route.get('/detail/:date', 'SuperAdmin/ReportSalesController.detail')
    Route.get('/exportExcel', 'SuperAdmin/ReportSalesController.exportExcel') 
    Route.get('/exportExcelAll', 'SuperAdmin/ReportSalesController.exportExcelAll') 
  }).prefix('/report/sales')

  Route.group(() => {
    Route.get('/list/year', 'SuperAdmin/ReportPurchaseOrdersController.indexYear')
    Route.get('/list/month', 'SuperAdmin/ReportPurchaseOrdersController.indexMonth')
    Route.get('/list/daily', 'SuperAdmin/ReportPurchaseOrdersController.indexDaily')
    Route.get('/widget', 'SuperAdmin/ReportPurchaseOrdersController.widget')
    Route.get('/chart/year', 'SuperAdmin/ReportPurchaseOrdersController.purchaseChartYear')
    Route.get('/chart/month', 'SuperAdmin/ReportPurchaseOrdersController.purchaseChartMonth')
    Route.get('/detail/:date', 'SuperAdmin/ReportPurchaseOrdersController.detail')
    Route.get('/export/excel', 'SuperAdmin/ReportPurchaseOrdersController.exportExcel')
    Route.get('/performa/export/excel', 'SuperAdmin/ReportPurchaseOrdersController.exportExcel')
    Route.get('/exportExcel/invoice', 'SuperAdmin/ReportPurchaseOrdersController.exportExcelInvoice')
  }).prefix('/report/po')

  Route.group(() => {
    Route.get('/list', 'SuperAdmin/StocksController.index')
    // Route.get('/detail/:id', 'SuperAdmin/StocksController.detail')
    // Route.get('/index/onhand', 'SuperAdmin/StocksController.indexOnHand')
    // Route.get('/index/warning', 'SuperAdmin/StocksController.indexWarning')
    // Route.get('/in/out/list', 'SuperAdmin/StocksController.indexStock')
    // Route.get('/in/out/detail', 'SuperAdmin/StocksController.detailStock')
  }).prefix('/stock')


  Route.group(() => {
    Route.get('/list/request', 'SuperAdmin/RequestPoController.indexRequest')
    Route.post('/create/request', 'SuperAdmin/RequestPoController.createRequest')
    Route.patch('/update/request', 'SuperAdmin/RequestPoController.updateRequest')
    Route.get('/detail/request/:id', 'SuperAdmin/RequestPoController.detailRequest')
    Route.patch('/approval', 'SuperAdmin/RequestPoController.approval')
    Route.get('/log', 'SuperAdmin/RequestPoController.getLogPo')
    
    Route.get('/list/proforma', 'SuperAdmin/PurchaseOrdersController.indexProforma')
    Route.post('/create/proforma', 'SuperAdmin/PurchaseOrdersController.createProforma')
    Route.get('/detail/proforma/:id', 'SuperAdmin/PurchaseOrdersController.detailProforma')
    Route.patch('/update/proforma', 'SuperAdmin/PurchaseOrdersController.EditProforma')
    Route.patch('/approve/edit/proforma', 'SuperAdmin/PurchaseOrdersController.approveEditProforma')
    Route.patch('/reject/edit/proforma', 'SuperAdmin/PurchaseOrdersController.rejectEditProforma')
    Route.patch('/update/status/payment', 'SuperAdmin/PurchaseOrdersController.updateStatusPayment')
    Route.patch('/receiving', 'SuperAdmin/PurchaseOrdersController.receiving')
    Route.patch('/void', 'SuperAdmin/PurchaseOrdersController.void')
    Route.patch('/update/invoice', 'SuperAdmin/PurchaseOrdersController.updateFinal')
    Route.post('/input/stock', 'SuperAdmin/PurchaseOrdersController.inputStock')
    Route.get('/receiving/detail/:id', 'SuperAdmin/PurchaseOrdersController.detailReceiving')
    Route.patch('/receiving/update/', 'SuperAdmin/PurchaseOrdersController.updateReceiving')
    Route.get('/exportExcel', 'SuperAdmin/PurchaseOrdersController.exportExcel')
    Route.get('/exportExcel/po', 'SuperAdmin/PurchaseOrdersController.exportExcelPerforma')
    Route.get('/export/accurate', 'SuperAdmin/PurchaseOrdersController.exportAccurate')
  }).prefix('/po')
  
  Route.group(() => {
    Route.post('/create', 'SuperAdmin/BranchesController.create')
    Route.get('/list', 'SuperAdmin/BranchesController.index')
    Route.get('/list/staff/branch', 'SuperAdmin/BranchesController.getUserInBranch')
    Route.get('/detail/:id', 'SuperAdmin/BranchesController.detail')
    Route.patch('/update', 'SuperAdmin/BranchesController.update')
    Route.patch('/updateStatus', 'SuperAdmin/BranchesController.updateStatus')
  }).prefix('/branch')

  Route.group(() => {
    Route.get('/list', 'SuperAdmin/MasterProductController.index')
    Route.get('/detail/:id', 'SuperAdmin/MasterProductController.detail')
    Route.post('/create', 'SuperAdmin/MasterProductController.create')
    Route.patch('/update', 'SuperAdmin/MasterProductController.update')
    Route.patch('/update/status', 'SuperAdmin/MasterProductController.updateStatus')
    Route.delete('/delete', 'SuperAdmin/MasterProductController.delete')
    Route.get('/export/master', 'SuperAdmin/MasterProductController.exportMasterProduct')
  }).prefix('/product/master')

  Route.group(() => {
    Route.post('/create', 'SuperAdmin/ClonningsController.create')
  }).prefix('/product/clonning')

  Route.group(() => {
    Route.get('/list', 'SuperAdmin/BranchProductController.index')
    Route.get('/list/item', 'SuperAdmin/BranchProductController.getItem')
    Route.get('/list/item_by_id', 'SuperAdmin/BranchProductController.getItemById')
    Route.get('/list/backup', 'SuperAdmin/BranchProductController.listIndex')
    Route.get('/list/item/backup', 'SuperAdmin/BranchProductController.getItemBackupStock')  
    Route.post('/create', 'SuperAdmin/BranchProductController.create')
    Route.get('/detail/:id', 'SuperAdmin/BranchProductController.detail')
    Route.patch('/update', 'SuperAdmin/BranchProductController.update')
    Route.patch('/update/status', 'SuperAdmin/BranchProductController.updateStatus')
    Route.delete('/delete', 'SuperAdmin/BranchProductController.delete')
    Route.get('/exportExcel', 'SuperAdmin/BranchProductController.export')
    Route.get('/export/accurate', 'SuperAdmin/BranchProductController.exportAccurate')
  }).prefix('/branch/product')

  Route.group(() => {
    Route.get('/list', 'SuperAdmin/TransactionsController.index')
    Route.post('/create', 'SuperAdmin/TransactionsController.create')
    Route.get('/detail/:id', 'SuperAdmin/TransactionsController.detail')
    Route.patch('/update/status', 'SuperAdmin/TransactionsController.updateStatus')
    Route.patch('/update/payment', 'SuperAdmin/TransactionsController.makePayment')
    Route.patch('/void', 'SuperAdmin/TransactionsController.void')
    Route.get('/exportExcel', 'SuperAdmin/TransactionsController.exportExcel')
    Route.get('/export/accurate', 'SuperAdmin/TransactionsController.exportAccurate')
    Route.get('/log', 'SuperAdmin/TransactionsController.getLogTrx')
  }).prefix('/transaction')

  Route.group(() => {
    Route.get('/list', 'SuperAdmin/ProductCategoriesController.index')
    Route.post('/create', 'SuperAdmin/ProductCategoriesController.create')
    Route.patch('/update', 'SuperAdmin/ProductCategoriesController.update')
    Route.patch('/update/status', 'SuperAdmin/ProductCategoriesController.updateStatus')
    Route.get('/tree', 'SuperAdmin/ProductCategoriesController.tree')
    Route.get('/list/parent', 'SuperAdmin/ProductCategoriesController.listParentOnly')
    Route.get('/list/sub', 'SuperAdmin/ProductCategoriesController.listSub')
    Route.delete('/remove', 'SuperAdmin/ProductCategoriesController.remove')
    Route.post('/create/bulk', 'SuperAdmin/ProductCategoriesController.createBulk')
    Route.get('/detail/:id', 'SuperAdmin/ProductCategoriesController.detail')
    Route.patch('/update/bulk', 'SuperAdmin/ProductCategoriesController.updateBulk')
  }).prefix('/product/categories')

  Route.group(() => {
    Route.post('/create', 'SuperAdmin/ProductPackagesController.create')
    Route.patch('/update', 'SuperAdmin/ProductPackagesController.update')
    Route.get('/list', 'SuperAdmin/ProductPackagesController.list')
    Route.delete('/delete', 'SuperAdmin/ProductPackagesController.delete')
  }).prefix('/product/package')

  Route.group(() => {
    Route.post('/master/product', 'SuperAdmin/ImportBulksController.importMasterProduct')
    Route.post('/branch/product', 'SuperAdmin/ImportBulksController.importBranchProduct')
  }).prefix('/bulk')

  
  Route.group(() => {
    Route.get('/list', 'SuperAdmin/UsersController.index')
    Route.post('/create', 'SuperAdmin/UsersController.create')
    Route.patch('/update', 'SuperAdmin/UsersController.update')
    Route.get('/detail/:id', 'SuperAdmin/UsersController.detail')
    Route.delete('/delete', 'SuperAdmin/UsersController.delete')
    Route.get('/export/excel', 'SuperAdmin/UsersController.exportExcel')
    Route.get('/export/accurate', 'SuperAdmin/UsersController.exportAccurate')
  }).prefix('/user/customer')

  Route.group(() => {
    Route.post('/create', 'SuperAdmin/StaffController.create')
    Route.get('/list', 'SuperAdmin/StaffController.index')
    Route.patch('/update', 'SuperAdmin/StaffController.update')
    Route.patch('/move', 'SuperAdmin/StaffController.moveBranch')
    Route.get('/detail/:id', 'SuperAdmin/StaffController.detail')
    Route.delete('/delete', 'SuperAdmin/UsersController.delete')
    Route.get('/export/excel', 'SuperAdmin/StaffController.exportExcel')
  }).prefix('/user/staff')

  Route.group(() => {
    Route.get('/list', 'SuperAdmin/SuppliersController.index')
    Route.get('/detail/:id', 'SuperAdmin/SuppliersController.detail')
    Route.post('/create', 'SuperAdmin/SuppliersController.create')
    Route.patch('/update', 'SuperAdmin/SuppliersController.update')
    Route.delete('/delete', 'SuperAdmin/SuppliersController.delete')
    Route.get('/export', 'SuperAdmin/SuppliersController.export')
    Route.get('/export/accurate', 'SuperAdmin/SuppliersController.exportAccurate')
  }).prefix('/supplier')

  Route.group(() => {
    Route.get('/', 'SuperAdmin/UsersController.profile')
    Route.patch('/update', 'SuperAdmin/UsersController.updateProfile')
    Route.patch('/update/password', 'SuperAdmin/UsersController.updatePassword')
  }).prefix('/profile')


}).middleware(['all_admin'])

/* end */
