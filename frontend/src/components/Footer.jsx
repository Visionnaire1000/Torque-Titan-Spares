import '../styles/footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="columns">
        <div className='socials'>
          <p>Social Media</p>
           <a href="https://www.instagram.com">
             <i class="fab fa-instagram"></i>
           </a>
          <a href="https://www.facebook.com">
            <i class="fab fa-facebook"></i>
          </a>
          </div>
          <div className='contacts'>
            <h5>Contact</h5>
            <li>Email: torquetitanspares@gmail.com</li>
            <li>Phone: +254 123 458399</li>
          </div>
          <div className='policies'>
            <p>Privacy Policy</p>
            <p>About Us</p>
            <p>Cookies</p>
            <p>Terms of service</p>
          </div>
      </div>
      <div className="bottomBar">
        <p>&copy; {new Date().getFullYear()} Torque Titan Spare Parts. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;