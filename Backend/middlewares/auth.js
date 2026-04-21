import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ msg: "Access denied: No token in cookies" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ msg: "Invalid or expired token", error: error.message });
  }
};

export default verifyToken;
