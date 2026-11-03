const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    console.log('JWT_SECRET loaded:', Boolean(process.env.JWT_SECRET))
    console.log('Token received:', Boolean(token))

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const allowedRoles = ['admin', 'dairyOwner', 'farmer']

    if (
      !decoded.accountId ||
      !allowedRoles.includes(decoded.role)
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      })
    }

    if (
      decoded.role !== 'admin' &&
      !decoded.dairyId
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      })
    }

    req.user = {
      accountId: decoded.accountId,
      role: decoded.role,
      dairyId: decoded.dairyId
        ? String(decoded.dairyId).replace(/^["']+|["']+$/g, '').trim()
        : null,
    }

    next()
  } catch (error) {
  console.log('JWT ERROR:', error.name, error.message);

  return res.status(401).json({
    success: false,
    message: 'Invalid or expired token. Please log in again.',
  });
}
}

module.exports = authMiddleware