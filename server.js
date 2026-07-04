const version = require('./helpers').apiVersion

const jsonServer = require('json-server')
const server = jsonServer.create()

const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })
const viabilidadeHandler = require('./routes/viabilidade')

const views = require('./views.js')()
const router = jsonServer.router(views)

const middlewares = jsonServer.defaults()
const port = process.env.PORT || 3000

const geosampa = require('./routes/geosampa')

server.get('/', (req, res) => res.redirect('/simulador.html'))
server.use(middlewares)
server.get(`/${version}/geosampa/busca`, geosampa.busca)
server.get(`/${version}/geosampa/lote`, geosampa.lote)
server.get(`/${version}/geosampa/contexto`, geosampa.contexto)
server.post(`/${version}/viabilidade`, upload.single('imagem'), viabilidadeHandler)
server.use(`/${version}`, router)

server.listen(port)