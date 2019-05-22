# gopro-to-flysight
Turn gopro telemetry data to the same CSV format as a flysight unit


## Usage

```
yarn
yarn build
yarn parse /Users/jallison/Desktop/GH010928.MP4
```

You will get both these files inside the `/output` folder: 
- `GH010928.MP4.json`: Contains raw JSON data from the mp4 metadata (GPS5 steam only)
- `GH010928.MP4.csv`: Contains CSV data in the same format as FlySight (see http://flysight.ca/wiki/index.php/File_format)

You should now be able to use this CSV file in various flight analysis applications, such as skyderby.ru or baseline.ws