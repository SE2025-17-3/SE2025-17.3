// map-server/backend/src/middleware/adminMiddleware.js

export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Truy cập bị từ chối. Yêu cầu quyền Admin.' });
    }
};