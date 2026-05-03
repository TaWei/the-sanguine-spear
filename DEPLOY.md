# Deployment

## Build

```bash
npm run build
```

The `dist/` directory contains static files ready for production.

## Serve

The `dist/` directory contains static files. Serve with any web server.

### Nginx

```nginx
server {
    listen 80;
    root /path/to/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Hostinger KVM2

1. Build the project locally or on the server:
   ```bash
   npm run build
   ```

2. Upload the contents of the `dist/` directory to `/var/www/html/` on your Hostinger KVM2 VPS, or configure an Apache virtual host pointing to the `dist/` directory.

3. If using Apache, ensure `.htaccess` override is enabled in your Apache configuration:
   ```apache
   <Directory /var/www/html>
       AllowOverride All
   </Directory>
   ```

4. The included `.htaccess` handles SPA routing by rewriting all requests to `index.html`.

### Apache (generic)

The included `.htaccess` file enables SPA routing:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

Place `.htaccess` in the same directory as `index.html`.
