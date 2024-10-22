# Supercut

#cli #ml #gemini #nodejs

Automataic montage video generation with Google Gemini LLM. You can ask it to search for moments of a video (ex. "Find every moment the speaker says _something_") and it will respond with timestamps. Then, corresponding video clips are rendered and stitched together to create a montage video. You can also input multiple videos, then the program will generate a supercut video.

## How to install

1. ffmpeg is required to create video. On Mac: `brew install ffmpeg`
1. Clone this repo: `git clone https://github.com/cdaein/supercut.git`
1. Change directory to the local repo: `cd supercut`
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
              --directory <folder_path> \ # use either --video or --directory, but not both
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

## Batch Processing

When you supply multiple source videos, the program processes each video at a time and at the end, it creates a concatenated supercut video. You may, however, notice that it throws an error, audio is out of sync or frames are frozen. It is due to differences in resolution, frame rate, video keyframes, number of audio channels (ex. 5.1), etc. of different source videos. Re-encoding before you run commands helps minimize errors. Supercut provides the `encode` command to encode vidoes from a directory with the same settings. It also creates segments if video is longer than 1 hour to meet Google requirement.

```sh
suprcut encode --directory <dir_path> \ # place videos in a folder to encode
               --video <video_path...> \ # use either --directory --video, but not both
               --width <value> \ # optional. if you want to resize and crop
               --height <value> \ # optional.
               --help
```

By default, the script looks for the most common resolution and scale and/or crop other videos. It also uses the same video keyframe settings and frame rate (24fps).

## Notes

- Each timestamp (and thus generated video clip) will be 1 second or longer because Gemini can only look at video at 1 fps. Using `--buffer <negative_value>` option can generate shorter clips but due to video keyframing issue, there may be issues such as frozen frames.
- You may get a better result (but slower) by using `gemini-1.5-pro` model instead of the default `gemini-1.5-flash` but beware of [the usage limit on the free tier](https://ai.google.dev/pricing).
- I've noticed that Gemini doesn't do well on searching for audio phrases only. If you are not searching for image content, [videogrep](https://github.com/antiboredom/videogrep) is a great option.

## Examples

I uploaded a 13-minute long public domain documentary [A Bronx Morning (1931)](https://www.loc.gov/item/2021604036/) and asked to "find street signages." Supercut created the following montage video:

<video src="https://github.com/user-attachments/assets/e5335458-ab37-406e-a9ce-020c99f89a19"></video>

I uploaded 6 animated films from the silent film era found from The Library of Congress collection, and extracted "text sound effects." Some timestamps were unrelated and had to be removed manually before creating a montage:

<video width="320" height="240" src="https://github.com/user-attachments/assets/4115d49c-14be-45a8-9a1e-3427d6ed65de"></video>

## Uninstall

1. First, check whether it is installed as a global package: `npm ls -g`
2. If it is, uninstall with the command: `npm uninstall -g supercut`
3. Remove the cloned folder.

## References

- [Gemini Error Codes](https://ai.google.dev/gemini-api/docs/troubleshooting#error-codes)
- [Gemini Node.js API](https://github.com/google-gemini/generative-ai-js/)
- [Gemini prompting with video](https://ai.google.dev/gemini-api/docs/vision?lang=node)
