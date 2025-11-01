import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// --- Cấu hình ban đầu ---
dotenv.config();
connectDB();

const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(cors());
app.use(express.json());

// --- Kết nối MongoDB (giữ nguyên) ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Server'))
    .catch(err => console.error('❌ Could not connect to MongoDB', err));

// --- Schema và Model (giữ nguyên) ---
const pixelSchema = new mongoose.Schema({
    gx: { type: Number, required: true },
    gy: { type: Number, required: true },
    color: { type: String, default: '#000000' }
});
pixelSchema.index({ gx: 1, gy: 1 }, { unique: true });
const Pixel = mongoose.model('Pixel', pixelSchema);

const CHUNK_SIZE = 256;

app.get('/api/pixels/chunk/:chunkX/:chunkY', async (req, res) => {
    try {
        const chunkX = parseInt(req.params.chunkX, 10);
        const chunkY = parseInt(req.params.chunkY, 10);

        // Tính toán phạm vi tọa độ grid cho chunk được yêu cầu
        const gx_min = chunkX * CHUNK_SIZE;
        const gx_max = (chunkX + 1) * CHUNK_SIZE;
        const gy_min = chunkY * CHUNK_SIZE;
        const gy_max = (chunkY + 1) * CHUNK_SIZE;

        // Truy vấn MongoDB để chỉ lấy pixel trong phạm vi này
        const pixels = await Pixel.find({
            gx: { $gte: gx_min, $lt: gx_max },
            gy: { $gte: gy_min, $lt: gy_max }
        }).select('gx gy color -_id');

        res.json(pixels);
    } catch (err) {
        console.error("Lỗi khi lấy chunk:", err);
        res.status(500).json({ error: "Không thể lấy dữ liệu chunk" });
    }
});



app.post('/api/pixels', async (req, res) => {
    const { gx, gy, color } = req.body;
    try {
        const updatedPixel = await Pixel.findOneAndUpdate(
            { gx, gy },
            { color, updated_at: new Date() },
            { new: true, upsert: true, select: 'gx gy color' }
        );
        io.emit('pixel_placed', updatedPixel);
        res.status(201).json(updatedPixel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ... (phần Socket.IO và server.listen giữ nguyên)
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));