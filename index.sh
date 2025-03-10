#!/bin/sh

mkdir -p index/0
mkdir -p index/1
mkdir -p index/2
mkdir -p index/3

touch index/5
touch index/6
touch index/7

printf "%s\n" $(printf %s "$1" | base64 -w 0) >> index/4

if [ -z $(cat index/7) ]; then
  printf "1" > index/7
fi

while [ -n "$(cat index/4)" ]; do
  while read url; do
    decoded_url=$(printf %s "$url" | base64 -d)

    printf "Indexing %s\n" "$decoded_url"
    curl "$decoded_url" -so "index/0/$url"

    grep -oE "[[:alnum:]]+" "index/0/$url" | sort | tr "[:upper:]" "[:lower:]" > "index/1/-$url"
    cat "index/1/-$url" | sort -u > "index/1/$url"

    while read word; do
      word_count=$(grep -cxF "$word" "index/1/-$url")
      printf %s "$word_count" >> "index/2/$url"
      if [ "$(cat index/7)" -lt "$word_count" ]; then
        printf %s "$word_count" > index/7
      fi
    done < "index/1/$url"

    rm "index/1/-$url"

    grep -oE "https?://[[:alnum:]._~/$'+%-]+" "index/0/$url" > "index/-5"

    while read redirect; do
      printf "%s\n" $(printf %s "$redirect" | base64 -w 0) >> index/5
    done < index/-5
    rm index/-5

    while read token; do
      printf "%s\n" "$url" >> "index/3/$token"
    done < "index/1/$url"

    printf "%s\n" "$url" >> index/6
  done < index/4

  printf "" > index/4
  while read url; do
    if [ $(grep -cxF "$url" index/6) -eq 0 ]; then
      printf "%s\n" "$url" >> index/4
    fi
  done < index/5
  printf "" > index/5
done
