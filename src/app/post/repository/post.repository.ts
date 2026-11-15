import { IPost, Post } from './../model/post.model';
import { AbstractRepository } from "../../../lib/db/abstract.repository";

class PostRepository extends AbstractRepository<IPost>{
    constructor(){
        super(Post)
    }
}


//singleton
export default new PostRepository();