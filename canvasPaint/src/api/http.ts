import axios from 'axios';

const instance=axios.create({
    baseURL:'your-api-base-url'
})
export default instance;