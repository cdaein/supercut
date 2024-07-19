# Supercut

#cli #ml #gemini #nodejs

Automataic supercut video generation with Google Gemini. You can ask it to search for moments of a video (ex. "Find every moment the speaker says _something_") and it will respond with timestamps. Then, corresponding video clips are rendered and stitched together to create a montage video. You can also input multiple videos, then the program will generate a supercut video.

## How to install

1. ffmpeg is required to create video. on Mac: `brew install ffmpeg`
1. Clone this repo: `git clone XXXXXXXX`
1. Go into the directory: `cd XXXXXXXX`
1. Install the dependency: `npm i`
1. Install as a global package (dont' forget the `.`): `npm i -g .`
1. Now, you can run it with the command `supercut` from anywhere.

## How to use

You need to [get a Gemini API key](https://aistudio.google.com/) from Google. Then, create a `.env` file in the root of the project directory and paste the API key: `GEMINI_API_KEY=your-key-here`

Get videos ready for upload. Google supports a video length of up to 1 hour. The uploaded video is kept for 48 hours and you can refer to it by its unique ID for subsequent use. _Only upload videos that you are comfortable sharing with Google._

Run the following command:

```sh
supercut main --video ./input/your-video.mp4 --prompt "Find 3 interesting moments from the video."
```

The `main` command will first upload the video to Google and request Gemini to generate timstamps based on your prompt. If the file has already been uploaded before, it will reuse it to save time and resource. The timestamped Gemini response is saved to `./output/<datetime>/000-timestamps.txt`. The program continues and creates video clips according to the timestamps. These clips are also saved in the `output` directory. Lastly, the clips are concatenated into a single supercut video.

## Sub-commands

Sometimes, Gemini response is not formatted well. Sometimes, you want to edit out a few clips or change the order. If you want to intervene in the automatic process, use one of the sub-commands:

```sh
# upload a video to Google for inference. It will return a unique video ID.
supercut upload --video ./input/your-video.mp4

# request Gemini to generate timestamps. the result is saved as a text file.
supercut timestamps --id a6jx84j --prompt "Find 3 most important sections from the video"

# generate video clips based on the timestamps file
supercut clips --video ./input/your-video.mp4 --timestamps ./output/2024.07.13-16.50.26/000-timestamps.txt

# concatenate clips into a supercut video given the clip list file
supercut concat --clip-list ./output/2024.07.14-17.39.22/all-cliplist.txt

# Print the list of files uploaded to Google. You can see video ID (name), etc.
supercut list-files

# If you removed a few output clips, you want to regenerate the clip list
supercut cliplist --directory ./output/2024.07.17-18.33.42
```

## Available Options

```sh
supercut main --video <filepath> \
             --prompt <prompt> \
             --prompt-prepend <prompt> \
             --prompt-append <prompt> \
             --buffer <value> \ # add/shrink generated clip length by value in seconds
             --model <gemini_model> \ # optional. gemini-1.5-flash or gemini-1.5-pro
             --random \ # optional. the order of video clips will be randomized
             --help

supercut upload --video <video_filepath> \
                --help

supercut timestamps --id <video_id> \ # video ID retrieved from Google
                    --prompt <prompt> \
                    --model <gemini_model> \
                    --help

supercut clips --video <filepath> \
               --timestamps <filepath> \ # `response.txt` file with timestamps
               --buffer <value> \
               --random \ # optional. write clip list in random order
               --help

supercut concat --clip-list <text_file> \ # Clip list text file path
                --help

supercut list-files --num <value> \ # how many files to display.
                    --help

supercut cliplist --directory <path> \
                  --concat \ # generate concatenated clip list as well
                  --overwrite \ # overwrite existing clip list file(s)
                  --random \ # randomize the order of clips
                  --help
```

## Handling Multiple Videos

When you supply multiple source videos to create a concatenated video, you may notice that it throws an error, audio is out of sync or frames are frozen. It is due to differences in resolution, frame rate, video keyframes, number of audio channels (ex. 5.1), etc. Re-encoding source videos before you run commands help minimize errors.

```sh
suprcut encode --directory <dir_path> \ # place videos in a folder to encode
               --width <value> \ # optional. if you want to resize and crop
               --height <value> \ # optional.
               --help
```

By default, the script looks for the most common resolution and scale and/or crop other videos. It also uses the same video keyframe settings and frame rate (24fps).

## Notes

- Each timestamp (and thus generated video clip) will be 1 second or longer because Gemini can only look at video at 1fps. Using `--buffer <negative_value>` option can generate shorter clips but due to video keyframing issue, there may be issues such as frozen frames.
- You may get a better result (but slower) by using `gemini-1.5-pro` model instead of the default `gemini-1.5-flash` but beware of [the usage limit on the free tier](https://ai.google.dev/pricing).

## References

- [Gemini Error Codes](https://ai.google.dev/gemini-api/docs/troubleshooting#error-codes)
- [Gemini Node.js API](https://github.com/google-gemini/generative-ai-js/)
- [Gemini prompting with video](https://ai.google.dev/gemini-api/docs/vision?lang=node)
