import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { apiAssetSource } from '../utils/avatar';

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
    let objectUrl = '';
    setImageSrc('');
    setError(false);

    const loadImage = async () => {
      try {
        const response = await api.get(apiAssetSource(src) || src, {
          responseType: 'blob',
        });
        if (isMounted) {
          objectUrl = URL.createObjectURL(response.data);
          setImageSrc(objectUrl);
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
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (error) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: '#eee',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Error loading image
      </div>
    );
  }

  if (!imageSrc) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: '#eee',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Loading...
      </div>
    );
  }

  return <img src={imageSrc} alt={alt} className={className} />;
};

export default SecureImage;
