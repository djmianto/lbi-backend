const createSuccess = async(msg:string, data:any) => {
	return {
		code: 201,
		status: 'success',
		message: msg,
		result: data
	}
}

const createFailed = async(msg:string, data:any) => {
	return {
		code: 400,
		status: 'error',
		message: msg,
		result: data
	}
}

const createDuplicated = async(msg:string, data:any) => {
	return {
		code: 409,
		status: 'error',
		message: msg,
		result: data
	}
}

const listSuccess = async(msg:string, data:any) => {
	return {
		code: 200,
		status: 'success',
		message: msg,
		result: data
	}
}

const notFound = async(msg:string, data:any) => {
	return {
		code: 404,
		status: 'error',
		message: msg,
		result: data
	}
}

const serverError = async(msg:string, data:any) => {
	return {
		code: 500,
		status: 'internal server error',
		message: msg,
		result: data
	}
}


export default {
  createSuccess,
	createFailed,
	createDuplicated,
	listSuccess,
	notFound,
	serverError
}
