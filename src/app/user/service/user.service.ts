import { s3CloudProvider } from './../../../lib/cloud/init';
import type { CloudFile, ICloudProvider } from "../../../pkg/cloud/cloud.interface";
import userRepository from '../repository/user.repository';

class UserService{
    private readonly cloudProvider:ICloudProvider = s3CloudProvider;
    private readonly userRepository = userRepository;
    uploadProfilePicture = async (file:CloudFile,userId:string)=>{
        const key = await this.cloudProvider.uploadFile(file,`users/${userId}`)
        return this.userRepository.update({_id:userId},{profilePicturePath:key});
    }
}

export default new UserService();

