import React, { useEffect, useState } from 'react';
import api from '../api/api';

interface Props {
  src: string;
  alt: string;
  className?: string;
}

const SecureImage: React.FC<Props> = ({ src, alt, className }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadImage = async () => {
      try {
        const response = await api.get(src, { responseType: 'blob' });
        if (isMounted) {
          setImageSrc(URL.createObjectURL(response.data));
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src]);

  if (error) {
    return <div className={className} style={{ backgroundColor: '#eee', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Error loading image</div>;
  }

  if (!imageSrc) {
    return <div className={className} style={{ backgroundColor: '#eee', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return <img src={imageSrc} alt={alt} className={className} />;
};

export default SecureImage;
