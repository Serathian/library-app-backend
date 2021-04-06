const {
  ApolloServer,
  gql,
  UserInputError,
  AuthenticationError,
} = require('apollo-server')
const mongoose = require('mongoose')
const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')
const jwt = require('jsonwebtoken')
const { collectFields } = require('graphql/execution/execute')
const { PubSub } = require('apollo-server')
const pubsub = new PubSub()
<<<<<<< HEAD
const DataLoader = require('dataloader')
=======

>>>>>>> fda763d69845459ca276a50b3b12880840b27039
const MONGODB_URI =
  'mongodb+srv://fullstack:fullstack@cluster0.nbmdu.mongodb.net/graphQL?retryWrites=true&w=majority'

const JWT_SECRET = 'NEED_HERE_A_SECRET_KEY'

console.log('connecting to', MONGODB_URI)

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connecting to MongoDb', error.message)
  })

mongoose.set('debug', true)

const typeDefs = gql`
  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String!]
  }

  type Author {
    name: String!
    born: Int
    id: ID!
    bookCount: Int
    books: [Book!]!
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    authorCount: Int!
    bookCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book

    editAuthor(name: String!, setBornTo: Int!): Author

    createUser(username: String!, favoriteGenre: String!): User

    login(username: String!, password: String!): Token
  }

  type Subscription {
    bookAdded: Book!
  }
`

const resolvers = {
  Query: {
    authorCount: () => Author.collection.countDocuments(),
    bookCount: () => Book.collection.countDocuments(),
    allBooks: (root, args) => {
      if (args.author && args.genre) {
        return Book.find({ author: args.author, genres: args.genre })
      } else if (args.author) {
        return Book.find({ author: args.author })
      } else if (args.genre) {
        return Book.find({ genres: { $in: [args.genre] } })
      }
      return Book.find({})
    },
    allAuthors: () => Author.find({}),
    me: (root, args, context) => {
      return context.currentUser
    },
  },

  Book: {
    author: async ({ author }, _args, { loaders }) => {
      return await loaders.author.load(author)
    },
  },

  Author: {
    bookCount: (author) => author.books.length,
    books: (root) => root.books.map((b) => (b = Book.findById(b))),
  },

  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser
      if (!currentUser) {
        throw new AuthenticationError('not Authenticated')
      } else {
        const authorExsists = await Author.findOne({ name: args.author })
        if (!authorExsists) {
          const author = new Author({ name: args.author })
          const book = new Book({ ...args, author: author.id })
          author.books = author.books.concat(book)
          try {
            const result = await book.save()
            await author.save()
            console.log(result)
            return result
          } catch (error) {
            throw new UserInputError(error.message, { invalidArgs: args })
          }
        } else {
          const book = new Book({ ...args, author: authorExsists.id })
          authorExsists.books = authorExsists.books.concat(book)
          try {
            const result = await book.save()
            await authorExsists.save()
            console.log(result)
            pubsub.publish('BOOK_ADDED', { bookAdded: result })
            return result
          } catch (error) {
            throw new UserInputError(error.message, { invalidArgs: args })
          }
        }
      }
    },
    editAuthor: (root, args, context) => {
      const author = authors.find((author) => author.name === args.name)
      const currentUser = context.currentUser

      if (!currentUser) {
        throw new AuthenticationError('not Authenticated')
      }

      if (!author) {
        return null
      } else {
        const updatedAuthor = {
          ...author,
          born: args.setBornTo,
        }
        authors = authors.map((a) => (a.name === args.name ? updatedAuthor : a))
        return updatedAuthor
      }
    },
    createUser: (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      })

      return user.save().catch((error) => {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      if (!user || args.password !== 'secred') {
        throw new UserInputError('wrong credentials')
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      }

      return { value: jwt.sign(userForToken, JWT_SECRET) }
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED']),
    },
  },
<<<<<<< HEAD
}

const batchAuthors = async (keys) => {
  const authors = await Author.find({
    _id: {
      $in: keys,
    },
  })

  const mappedKeys = keys.map((key) =>
    authors.find((author) => author.id == key)
  )
  return mappedKeys
=======
>>>>>>> fda763d69845459ca276a50b3b12880840b27039
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLocaleLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET)
      const currentUser = await User.findById(decodedToken.id)

      return {
        currentUser,
        loaders: { author: new DataLoader((keys) => batchAuthors(keys)) },
      }
    }
  },
})

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`Server ready at ${url}`)
  console.log(`Subscriptions ready at ${subscriptionsUrl}`)
})
