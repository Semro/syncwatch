package main

import (
	"sort"
	"time"
)

const (
	BaseDuration = 60000
	afkTime      = "1h"
)

func DisconectAfk(users []User) {
	// TODO
}

type Room struct {
	Name        string
	Event       string
	UpdatedTime time.Time
	users       []User
	Share       string
	afkTimer    *time.Timer
}

func NewRoom(name string) *Room {
	return &Room{Name: name}
}

func (r *Room) AddUser(socketID uint, name User) {
	if len(r.users) <= int(socketID) {
		r.users[socketID] = name
	}

	r.setAfkTimer()
}

func (r *Room) DisconectUser(socketID uint) {
	r.users = append(r.users[:socketID], r.users[socketID+1:]...)
	r.setAfkTimer()
}

func (r Room) GetUser(socketID uint) User {
	return r.users[socketID]
}

func (r Room) GetUsersNames() []string {
	names := make([]string, len(r.users))
	for _, user := range r.users {
		names = append(names, string(user))
	}
	sort.Strings(names)
	return names
}

func (r *Room) setAfkTimer() {
	duration, err := time.ParseDuration(afkTime)
	if err != nil {
		panic(err)
	}

	if len(r.users) == 1 {
		r.afkTimer = time.AfterFunc(duration, func() {
			DisconectAfk(r.users)
		})
	} else {
		r.afkTimer.Stop()
	}
}
