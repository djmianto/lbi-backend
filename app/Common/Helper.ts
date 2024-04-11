// import rn from 'random-number'
import Database from '@ioc:Adonis/Lucid/Database'
import moment from 'moment-timezone'
moment.tz.setDefault('Asia/Jakarta')
// import { DateTime } from 'luxon'

const randomNumber = async () => {
  let res = 'MT-' + '01/' + '000' + moment().format('mm') + await generateChar(4) // generate kode 6 digit angka dan huruf
  return res
}

const randomNumberTrans = async (payload) => {
  const getBranchCode = await Database
    .query()
    .select('branch_code')
    .from('branches')
    .where('branch_id', payload)
    .first()

  let res = 'MT-' + `${getBranchCode.branch_code}/` + '000' + moment().format('mm') + await generateChar(4) // generate kode 6 digit angka dan huruf
  return res
}

const customReqNumber = async (code) => {
  let res = code + moment().format('mm') + await generateChar(5) // generate kode 5 digit angka dan huruf
  return res
}

const customProformaNumber = async (code) => {
  let res = code + moment().format('mm') + await generateChar(8) // generate kode 5 digit angka dan huruf
  return res
}

const generateReffCode = async () => {
  let res: any = ''
  res = 'RD' + moment().format('mm') + await generateChar(4) // generate kode 6 digit angka dan huruf
  let i = false
  while (i == false) {
    const getMasterReff = await Database
      .query()
      .select('master_reff_code')
      .from('master_reffs')
      .where('master_reff_code', res)
      .first()
    if (getMasterReff) {
      res = 'RD' + moment().format('mm') + await generateChar(4)
    } else {
      i = true
    }
  }
  return res
}

const generateOtpCode = async () => {
  let res: any = ''
  res = await generateNumber(6) // generate kode 6 digit angka dan huruf
  let i = false
  while (i == false) {
    const getMasterReff = await Database
      .query()
      .select('user_otp_code')
      .from('users')
      .where('user_otp_code', res)
      .first()
    if (getMasterReff) {
      res = await generateNumber(6)
    } else if (res.length < 6) {
      res = await generateNumber(6)
    } else {
      i = true
    }
  }
  console.log(res)
  return res
}

const generateOtpNew = async () => {
  let number: any = 6
  let result = ''
  let characters = '0123456789'
  let charactersLength = characters.length
  for (var i = 0; i < number; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  console.log(result)
  return result
}

const generateStockAdjustment = async () => {
  let res: any = ''
  res = 'ADJ' + moment().format('mm') + await generateNumber(5) // generate kode 6 digit angka dan huruf
  let i = false
  while (i == false) {
    const getStockAdjustment = await Database
      .query()
      .select('stock_adjustment_code')
      .from('stock_adjustments')
      .where('stock_adjustment_code', res)
      .first()
    if (getStockAdjustment) {
      res = 'RD' + moment().format('mm') + await generateChar(5)
    } else {
      i = true
    }
  }
  return res
}

const generateChar = async (length: number) => {
  let result: any = ''
  const characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

const generateNumber = async (length: number) => {
  let result: any = ''
  const characters: string = '0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

const pagination = (total: number, pagenum: number, limit: number) => {
  let total_page: number = Math.ceil(total / limit)

  let prev: number = pagenum - 1
  if (prev < 1) {
    prev = 0
  }

  let next: number = pagenum + 1
  if (next > total_page) {
    next = 0
  }

  return {
    total,
    per_page: limit,
    current_page: pagenum,
    last_page: total_page,
    first_page: 1,
    first_page_url: "/?page=1",
    last_page_url: "/?page=" + total_page,
    next_page_url: next > 0 ? "/?page=" + next : null,
    previous_page_url: prev > 0 ? "/?page=" + prev : null,
  }
}

const sanitizationResponse = (obj: object) => {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      Object.keys(item).map(function (key) {
        if (obj[index][key] == null) {
          obj[index][key] = ""
        }

        if (key.endsWith('created_at') || key.endsWith('updated_at') || key.endsWith('datetime')) {
          obj[index][key] = formatDate(obj[index][key])
        }

        if (key.endsWith('completed_at')) {
          obj[index][key] = formatDate(obj[index][key])
        }

        if (key.endsWith('date')) {
          obj[index][key] = formatDate(obj[index][key], 'date')
        }

        obj[index][key] = decodeHTMLEntities(obj[index][key])
      })
    })
  } else {
    if (typeof obj === 'object') {
      Object.keys(obj).map(function (key) {
        if (key.endsWith('reff')) {
          if (typeof obj[key] === 'object') {
            console.log(obj[key])
            Object.keys(obj[key]).map(function (keyObj) {
              if (keyObj.endsWith('created_at') || keyObj.endsWith('updated_at') || keyObj.endsWith('datetime')) {
                obj[key][keyObj] = formatDate(obj[key][keyObj])
              }
            })
          }
        }
        if (obj[key] == null) {
          obj[key] = ""
        }
        if (key.endsWith('created_at') || key.endsWith('updated_at') || key.endsWith('datetime')) {
          obj[key] = formatDate(obj[key], 'datetime')
        }

        if (key.endsWith('completed_at')) {
          obj[key] = formatDate(obj[key], 'datetime')
        }

        if (key.endsWith('date')) {
          obj[key] = formatDate(obj[key], 'date')
        }

        if (Array.isArray(obj[key])) {
          obj[key].forEach((item, index) => {
            Object.keys(item).map(function (x) {
              if (obj[key][index][x] == null) {
                obj[key][index][x] = ""
              }

              if (x.endsWith('created_at') || x.endsWith('updated_at') || x.endsWith('datetime')) {
                obj[key][index][x] = formatDate(obj[key][index][x])
              }

              if (x.endsWith('date')) {
                obj[key][index][x] = formatDate(obj[key][index][x], 'date')
              }

              if (key.endsWith('completed_at')) {
                obj[key] = formatDate(obj[key], 'datetime')
              }

              obj[key][index][x] = decodeHTMLEntities(obj[key][index][x])
            })
          })
        }

        obj[key] = decodeHTMLEntities(obj[key])
      })
    }
  }

  return obj
}

const arrayToTree = (arr: any, parent: number = 0, key: string = 'id',
  parentKey: string = 'parent_id', childKey: string = 'children') => {
  return arr.filter((item: { [x: string]: number }) => {
    return item[parentKey] === parent
  }).map((child: { [x: string]: number | undefined }) => {
    return ({ ...child, [childKey]: arrayToTree(arr, child[key], key, parentKey, childKey) })
  })
}

const decodeHTMLEntities = (text: any) => {
  let entities = [
    ['amp', '&'],
    ['apos', '\''],
    ['#x27', '\''],
    ['#x2F', '/'],
    ['#39', '\''],
    ['#47', '/'],
    ['lt', '<'],
    ['gt', '>'],
    ['nbsp', ' '],
    ['quot', '"']
  ];

  if (typeof text === 'string') {
    for (let i = 0, max = entities.length; i < max; ++i) {
      text = text.replace(new RegExp('&' + entities[i][0] + ';', 'g'), entities[i][1])
    }
  }

  return text;
}

const validDatesInRange = (start_date: Date, end_date: Date) => {
  let dateArray = new Array();
  let endDate = new Date(end_date)
  let currentDate = new Date(start_date);
  while (currentDate <= endDate) {
    let year = String(new Date(currentDate).getFullYear())
    let month = String(new Date(currentDate).getMonth() + 1).padStart(2, '0')
    let day = String(new Date(currentDate).getDate()).padStart(2, '0')
    let newDate = year+'-'+month+'-'+day

    dateArray.push(newDate)
    let currentDates = new Date (currentDate).setDate(new Date (currentDate).getDate() + 1)
    currentDate = new Date(currentDates)
  } 
  return dateArray;
}

const formatNumber = (num: { toString: () => string }, separator: string = '.') => {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, `$1${separator}`)
}

const padTo2Digits = (num: any) => {
  return num.toString().padStart(2, '0')
}

const formatDate = (value: any, type: string = 'datetime') => {
  if (!value) {
    return ''
  }

  const dateObject = new Date(value).toLocaleString("en-US", { timeZone: 'Asia/Jakarta' })
  // console.log(dateObject)
  let date: any = new Date(dateObject)
  if (date === 'Invalid Date') {
    return ''
  }

  if (type === 'datetime') {
    return (
      [
        date.getFullYear(),
        padTo2Digits(date.getMonth() + 1),
        padTo2Digits(date.getDate()),
      ].join('-') +
      ' ' +
      [
        padTo2Digits(date.getHours()),
        padTo2Digits(date.getMinutes()),
        padTo2Digits(date.getSeconds()),
      ].join(':')
    )
  }

  if (type === 'date') {
    return (
      [
        date.getFullYear(),
        padTo2Digits(date.getMonth() + 1),
        padTo2Digits(date.getDate()),
      ].join('-')
    )
  }

  if (type === 'time') {
    return (
      [
        padTo2Digits(date.getHours()),
        padTo2Digits(date.getMinutes()),
      ].join(':')
    )
  }

  if (type === 'timefull') {
    return (
      [
        padTo2Digits(date.getHours()),
        padTo2Digits(date.getMinutes()),
        padTo2Digits(date.getSeconds()),
      ].join(':')
    )
  }

  return ''

}

const formatDateNew = (date: Date) => {
  let newDate = new Date(date)
  let day = String(newDate.getDate()).padStart(2, '0')
  let month = String(newDate.getMonth() + 1).padStart(2, '0') //January is 0!
  let year = newDate.getFullYear();
  let dateFormat = day + "/" + month + "/" + year
  return dateFormat
}

export default {
  randomNumber,
  generateChar,
  pagination,
  sanitizationResponse,
  arrayToTree,
  decodeHTMLEntities,
  formatNumber,
  customReqNumber,
  customProformaNumber,
  formatDate,
  formatDateNew,
  randomNumberTrans,
  generateReffCode,
  generateStockAdjustment,
  generateOtpCode,
  generateOtpNew,
  validDatesInRange
}
