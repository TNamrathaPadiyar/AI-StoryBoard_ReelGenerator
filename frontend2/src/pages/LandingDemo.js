import "../styles/theme.css";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ParticlesBG from "../components/ParticlesBG";

function Landing(){
  const nav = useNavigate();

  return(
    <>
      <ParticlesBG />

      <div
        style={{
          minHeight:"100vh",
          display:"flex",
          flexDirection:"column",
          alignItems:"center",
          justifyContent:"center",
          textAlign:"center",
          padding:"20px"
        }}
      >

        <motion.h1
          initial={{opacity:0,y:40}}
          animate={{opacity:1,y:0}}
          transition={{duration:1}}
          className="neonText"
          style={{fontSize:"70px"}}
        >
          ShortsAI Creator Studio
        </motion.h1>

        <p style={{maxWidth:"650px"}}>
          Upload long videos and let AI automatically generate viral reels,
          highlights and captions for creators.
        </p>

        <motion.button
          whileHover={{scale:1.1}}
          className="btnPrimary"
          onClick={()=>nav("/dashboard")}
          style={{marginTop:"30px"}}
        >
          Try Demo
        </motion.button>

        {/* Feature Cards */}
        <div
          style={{
            display:"flex",
            gap:"30px",
            marginTop:"80px",
            flexWrap:"wrap",
            justifyContent:"center"
          }}
        >
          <div className="glass" style={{padding:"25px"}}>Auto Highlights</div>
          <div className="glass" style={{padding:"25px"}}>Smart Shorts</div>
          <div className="glass" style={{padding:"25px"}}>Caption AI</div>
        </div>

        {/* Chat Button */}
        <div
          style={{
            position:"fixed",
            bottom:"30px",
            right:"30px",
            background:"#ff4d6d",
            padding:"20px",
            borderRadius:"50%",
            cursor:"pointer",
            boxShadow:"0 0 20px #ff4d6d"
          }}
        >

        </div>

      </div>
    </>
  );
}

export default Landing;