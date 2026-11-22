import { a } from "framer-motion/client"


function Navbar({links}){
         return(
            <nav className="nav-bar">

            
                <span>GEETH.</span>

            <div className="nav-links">
                { links.map((link) => {
                    return(
                        <a key = {link.href} 
                           href ={link.href}
                        >
                        {link.label}
                        </a>
                    )
                })}

            </div>

            <a href="#contact" className="nav-cta">
               Let's talk ↗
            </a>
                
               
            </nav>

            
        
         )
}

export default Navbar