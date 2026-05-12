import { Link } from "react-router-dom";
import "../styles/theme.css";
import BrandMark from "./BrandMark";

function TopNav({ showHome = false, showAuth = false, rightContent = null }) {
  return (
    <header className="topbar topbar-sticky">
      <div className="brand">
        <div className="brand-mark">
          <BrandMark />
        </div>
        <div>
          <p className="brand-title">CinePulse Studio</p>
          <p className="brand-subtitle">AI short-form video production workspace</p>
        </div>
      </div>

      <nav className="nav-actions">
        {showHome ? <Link to="/" className="btn btn-secondary">Home</Link> : null}
        {showAuth ? (
          <>
            <Link to="/login" className="btn btn-secondary">Sign In</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </>
        ) : null}
        {rightContent}
      </nav>
    </header>
  );
}

export default TopNav;
