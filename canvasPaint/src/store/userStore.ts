import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
    state: () => ({
        username: '',
        // 其他用户相关状态
      }),
    actions:{
        setUsername(username : string){
            this.username=username;
        },
    },
})
// export const useDataStore=defineStore('data',{
//     state:()=>({
//         data:[]
//     }),
//     actions:{
//         async fetchData(){
//             const response=await http.get('/your-api-endpoint');
//             this.data=response.data
//             console.log(this.data);
            
//         }
//     }
// })
