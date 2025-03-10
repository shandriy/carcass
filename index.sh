#!/bin/sh

rm -rf index

mkdir -p index
mkdir -p index/0
mkdir -p index/1

printf %s "$1" | base64 >> index/2

while read url; do
  decoded_url=$(printf %s "$url" | base64 -d)

  echo "Indexing $decoded_url"
  curl "$decoded_url" -so "index/0/$url"

  url_contents=$(cat "index/0/$url")
  length_1=${#url_contents}
  length_2=$((${#url_contents} + 1))

  touch "index/1/$url"

  while [ "$length_1" -lt "$length_2" ]; do
    token="${url_contents%%[^A-Za-z0-9]*}"
    token=$(printf %s "$token" | tr "[:upper:]" "[:lower:]")

    if [ "$token" != "" ]; then
      contains_word=$(grep -xF "$token" "index/1/$url")
      if [ -z "$contains_word" ]; then
        printf "%s\n" "$token" >> "index/1/$url"
      fi
    fi

    length_2=${#url_contents}
    url_contents="${url_contents#*[^A-Za-z0-9]}"
    length_1=${#url_contents}
  done
done < index/2
