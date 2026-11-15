# DB Design

## User
- Id
- userName
- Email
- Password
- Phone Number
- Gender
- Provider

## Post
- Id
- Content
- userId
- createdAt
- updatedAt
- isDeleted
- commentsCounts
- reactionsCounts
- allowsComments Boolean

## Comments/Reply
- Id
- Content
- userId
- postId
- parentId
- reactionsCounts
- createdAt
- updatedAt
- isDeleted

## Reactions
- Id
- userId
- refId [postId,commentId]
- onModel ['Post','Comment']
- typr ENUM('Like','Love','Care','Angry')
- updatedAt